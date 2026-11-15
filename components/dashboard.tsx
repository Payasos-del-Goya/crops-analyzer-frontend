"use client";

import { useMemo, useState } from "react";
import { renderToString } from "react-dom/server";

import BalizaForm from "./baliza-form";
import BalizaPopup from "./baliza-popup";
import CropPicker from "./crop-picker";
import Map, { MapLink, MapMarkerData } from "./map";
import Monitor from "./monitor";

import { Baliza, BalizaCreate, CropInfo } from "@/lib/api";
import { deviceStatus, useMonitor } from "@/lib/monitor";

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
  // TODO: enviar como parámetros a GET /predictions cuando exista el endpoint.
  const [selectedCrops, setSelectedCrops] = useState<number[]>([]);
  const [zoneCount, setZoneCount] = useState(1);
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
  }, [balizas, cropNames, devices, monitor.icingaAvailable, monitor.now]);

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
      <Monitor
        devices={registeredDevices}
        error={monitor.error}
        labels={labels}
        now={monitor.now}
      />
    </section>
  );
}
