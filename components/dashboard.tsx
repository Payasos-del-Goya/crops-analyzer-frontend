"use client";

import { useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";

import BalizaForm from "./baliza-form";
import BalizaPopup from "./baliza-popup";
import CropPicker from "./crop-picker";
import Map, { MapArea, MapLink, MapMarkerData } from "./map";
import Monitor from "./monitor";
import Recomendacion, { bestCrop, zoneColor } from "./recomendacion";

import {
  Baliza,
  BalizaCreate,
  CropInfo,
  getRecomendacion,
  Recomendacion as RecomendacionData,
} from "@/lib/api";
import { deviceStatus, useMonitor } from "@/lib/monitor";
import { zoneAreas } from "@/lib/zonas";

/** Distancia en metros entre dos balizas. */
function distance(a: Baliza, b: Baliza): number {
  const k = Math.cos((Number(a.latitud) * Math.PI) / 180);

  return Math.hypot(
    (Number(a.longitud) - Number(b.longitud)) * 111_320 * k,
    (Number(a.latitud) - Number(b.latitud)) * 110_540,
  );
}

/** Más allá no se dibujan enlaces de malla entre nodos (alcance de radio). */
const MESH_RANGE_M = 1500;

/** ¿Pasa el segmento a–b cerca de la baliza c? (distancias en metros) */
function nearSegment(c: Baliza, a: Baliza, b: Baliza): boolean {
  const k = Math.cos((Number(a.latitud) * Math.PI) / 180);
  const xy = (p: Baliza) => [
    Number(p.longitud) * 111_320 * k,
    Number(p.latitud) * 110_540,
  ];
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  const [cx, cy] = xy(c);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;

  if (len2 === 0) return false;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
  const dist = Math.hypot(ax + t * dx - cx, ay + t * dy - cy);

  return dist < Math.max(15, 0.2 * Math.sqrt(len2));
}

interface DashboardProps {
  initialBalizas: Baliza[];
  crops: CropInfo[];
  backendError?: boolean;
}

export default function Dashboard({
  initialBalizas,
  crops,
  backendError = false,
}: DashboardProps) {
  const [balizas, setBalizas] = useState<Baliza[]>(initialBalizas);
  // Cultivos en orden de preferencia y número de zonas.
  const [selectedCrops, setSelectedCrops] = useState<number[]>([]);
  const [zoneCount, setZoneCount] = useState(1);
  // Recomendación del modelo (GET /recomendacion) para ese número de zonas.
  const [rec, setRec] = useState<RecomendacionData | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"monitor" | "recomendacion">("monitor");
  const recRequest = useRef(0);
  const [adding, setAdding] = useState(false);
  const [newPoint, setNewPoint] = useState<[number, number] | null>(null);

  const monitor = useMonitor();

  const devices = useMemo(
    () =>
      Object.fromEntries(
        (monitor.devices ?? []).map((d) => [d.dispositivo, d]),
      ),
    [monitor.devices],
  );

  const cropNames = useMemo(
    () => Object.fromEntries(crops.map((c) => [c.id, c.cultivo])),
    [crops],
  );

  // Zona de cada baliza en la recomendación, para colorearla en el mapa.
  const zoneOf = useMemo(
    () =>
      Object.fromEntries(
        (panel === "recomendacion" ? (rec?.zonas ?? []) : []).flatMap((z) =>
          z.balizas.map((b) => [b, z.zona]),
        ),
      ) as Record<string, number>,
    [panel, rec],
  );

  // Mejor cultivo de cada zona (el mismo que «Mejor opción» en el panel).
  const zoneBest = useMemo(
    () =>
      Object.fromEntries((rec?.zonas ?? []).map((z) => [z.zona, bestCrop(z)])),
    [rec],
  );

  // Superficie de cada zona rellena de su color, con el mejor cultivo escrito en medio.
  const areas = useMemo<MapArea[]>(() => {
    if (panel !== "recomendacion" || !rec) return [];
    const points = Object.fromEntries(
      balizas.map((b) => [b.id, [Number(b.latitud), Number(b.longitud)]]),
    ) as Record<string, [number, number]>;
    const shapes = zoneAreas(points, zoneOf);

    return rec.zonas.map((z) => {
      const shape = shapes[z.zona];
      const best = zoneBest[z.zona];

      return {
        color: zoneColor(z.zona),
        polygons: shape?.polygons ?? [],
        label:
          shape && best
            ? { lat: shape.label[0], lng: shape.label[1], text: best.cultivo }
            : undefined,
      };
    });
  }, [balizas, panel, rec, zoneBest, zoneOf]);

  const markers = useMemo<MapMarkerData[]>(() => {
    return balizas.map((b) => {
      const device = devices[b.id];

      return {
        id: b.id,
        lat: Number(b.latitud),
        lng: Number(b.longitud),
        label: b.label || b.id,
        variant: deviceStatus(device) === "down" ? "down" : "ok",
        role: device?.tipo === "puente" ? "puente" : "nodo",
        zoneColor: b.id in zoneOf ? zoneColor(zoneOf[b.id]) : undefined,
        cropId: b.id in zoneOf ? zoneBest[zoneOf[b.id]]?.id : undefined,
        popupHtml: renderToString(
          <BalizaPopup
            baliza={b}
            cropName={b.cultivo_id ? cropNames[b.cultivo_id] : undefined}
            device={device}
            icingaAvailable={monitor.icingaAvailable}
            now={monitor.now}
          />,
        ),
      };
    });
  }, [
    balizas,
    cropNames,
    devices,
    monitor.icingaAvailable,
    monitor.now,
    zoneOf,
    zoneBest,
  ]);

  // Red mesh: ruta real de cada nodo hacia su puente (estado.gateway) y
  // enlaces de malla entre nodos cercanos del mismo puente. Se omite un
  // enlace de malla si ya lo cubre una ruta, si los nodos están fuera de
  // alcance o si pasa por encima de otra baliza (se vería superpuesto).
  const links = useMemo<MapLink[]>(() => {
    const byId = Object.fromEntries(balizas.map((b) => [b.id, b]));
    const ids = balizas.map((b) => b.id);
    const isDown = (id: string) => deviceStatus(devices[id]) === "down";
    // Siguiente salto hacia el puente: `salto` si la baliza lo manda, si no el puente.
    const gateway = (id: string) =>
      devices[id]?.estado.salto ?? devices[id]?.estado.gateway;
    const out: MapLink[] = [];

    ids.forEach((id) => {
      const gw = gateway(id);

      if (gw && gw !== id && byId[gw])
        out.push({ from: id, to: gw, kind: "route", down: isDown(id) });
    });

    // Si las balizas dicen quiénes son sus vecinas, la malla son esos enlaces.
    if (ids.some((id) => devices[id]?.estado.vecinos)) {
      ids.forEach((a) =>
        (devices[a]?.estado.vecinos ?? "").split(",").forEach((b) => {
          if (!byId[b] || a >= b) return;
          if (gateway(a) === b || gateway(b) === a) return;
          out.push({
            from: a,
            to: b,
            kind: "mesh",
            down: isDown(a) || isDown(b),
          });
        }),
      );

      return out;
    }

    ids.forEach((a, i) =>
      ids.slice(i + 1).forEach((b) => {
        if (gateway(a) === b || gateway(b) === a) return;
        if (gateway(a) !== gateway(b)) return;
        if (distance(byId[a], byId[b]) > MESH_RANGE_M) return;
        const crossesNode = ids.some(
          (c) => c !== a && c !== b && nearSegment(byId[c], byId[a], byId[b]),
        );

        if (!crossesNode)
          out.push({
            from: a,
            to: b,
            kind: "mesh",
            down: isDown(a) || isDown(b),
          });
      }),
    );

    return out;
  }, [balizas, devices]);

  // En el monitor solo las balizas registradas en PostgreSQL: los nombres
  // antiguos que siguen en InfluxDB (b01..b03...) ya no existen.
  const registeredDevices = useMemo(() => {
    const ids = new Set(balizas.map((b) => b.id));

    return monitor.devices?.filter((d) => ids.has(d.dispositivo)) ?? null;
  }, [balizas, monitor.devices]);

  const labels = useMemo(
    () =>
      Object.fromEntries(
        balizas.filter((b) => b.label).map((b) => [b.id, b.label as string]),
      ),
    [balizas],
  );

  const recommend = (zones: number) => {
    const id = ++recRequest.current;

    setPanel("recomendacion");
    setRecLoading(true);
    setRecError(null);
    getRecomendacion(zones)
      .then((data) => id === recRequest.current && setRec(data))
      .catch(
        (e: Error) =>
          id === recRequest.current &&
          setRecError(`No se pudo calcular la recomendación: ${e.message}`),
      )
      .finally(() => id === recRequest.current && setRecLoading(false));
  };

  const tabs = (rec || recLoading || recError) && (
    <div className="flex gap-1 p-0.5 rounded-lg bg-[#040806] border border-emerald-950/60 text-xs">
      {(
        [
          ["recomendacion", "Recomendación"],
          ["monitor", "Monitor"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          className={`flex-1 px-2 py-1 rounded-md ${
            panel === key
              ? "bg-emerald-900/60 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          type="button"
          onClick={() => setPanel(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const closeForm = () => {
    setAdding(false);
    setNewPoint(null);
  };

  const handleCreated = (b: BalizaCreate) => {
    setBalizas((prev) => [...prev, b]);
    closeForm();
  };

  return (
    <section className="flex items-stretch justify-center gap-4 w-full h-[calc(100vh-5rem)] p-4">
      <Map
        areas={areas}
        center={[41.685, -0.887]}
        links={links}
        markers={markers}
        pendingPoint={newPoint}
        picking={adding}
        zoom={16}
        onMapClick={adding ? (lat, lng) => setNewPoint([lat, lng]) : undefined}
      >
        <CropPicker
          crops={crops}
          selected={selectedCrops}
          zones={zoneCount}
          onChange={(ids, zones) => {
            setSelectedCrops(ids);
            setZoneCount(zones);
            // Solo se recalcula si cambian las zonas: los cultivos elegidos se
            // marcan sobre la lista completa que ya ha llegado.
            if (zones !== zoneCount || (!rec && !recLoading)) recommend(zones);
            else setPanel("recomendacion");
          }}
        />
        {backendError && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1100] px-3 py-1.5 text-xs rounded-lg bg-red-950/90 text-red-300 border border-red-900">
            No se pudo conectar con el backend
          </div>
        )}
        {adding ? (
          <BalizaForm
            crops={crops}
            point={newPoint}
            onCancel={closeForm}
            onCreated={handleCreated}
            onPointChange={setNewPoint}
          />
        ) : (
          <button
            className="absolute top-4 right-4 z-[1100] px-3 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
            type="button"
            onClick={() => setAdding(true)}
          >
            + Añadir baliza
          </button>
        )}
      </Map>
      {panel === "recomendacion" ? (
        <div className="w-80 h-full shrink-0 p-4 rounded-xl border border-emerald-950/50 bg-[#060e0a] flex flex-col gap-3">
          {tabs}
          <div className="flex-1 overflow-y-auto -mr-2 pr-2">
            <Recomendacion
              cropNames={cropNames}
              data={rec}
              error={recError}
              labels={labels}
              loading={recLoading}
              selected={selectedCrops}
            />
          </div>
        </div>
      ) : (
        <Monitor
          devices={registeredDevices}
          error={monitor.error}
          header={tabs}
          labels={labels}
          now={monitor.now}
        />
      )}
    </section>
  );
}
