"use client";

import { useMemo, useState } from "react";
import { renderToString } from "react-dom/server";

import BalizaForm from "./baliza-form";
import BalizaPopup from "./baliza-popup";
import CropPicker from "./crop-picker";
import Map, { MapMarkerData } from "./map";
import Monitor from "./monitor";

import { Baliza, BalizaCreate, CropInfo } from "@/lib/api";
import { deviceStatus, useMonitor } from "@/lib/monitor";

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
  // Hasta 3 cultivos en orden de preferencia.
  // TODO: enviar como parámetro a GET /predictions cuando exista el endpoint.
  const [selectedCrops, setSelectedCrops] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [newPoint, setNewPoint] = useState<[number, number] | null>(null);

  const monitor = useMonitor();

  const markers = useMemo<MapMarkerData[]>(() => {
    const devices = Object.fromEntries(
      (monitor.devices ?? []).map((d) => [d.dispositivo, d]),
    );
    const cropsById = Object.fromEntries(crops.map((c) => [c.id, c]));

    return balizas.map((b) => {
      const device = devices[b.id];

      return {
        id: b.id,
        lat: Number(b.latitud),
        lng: Number(b.longitud),
        label: b.label || b.id,
        variant: deviceStatus(device) === "down" ? "down" : "ok",
        popupHtml: renderToString(
          <BalizaPopup
            baliza={b}
            crop={b.cultivo_id != null ? cropsById[b.cultivo_id] : undefined}
            device={device}
            now={monitor.now}
          />,
        ),
      };
    });
  }, [balizas, crops, monitor.devices, monitor.now]);

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
        center={[41.683298, -0.88442]}
        markers={markers}
        pendingPoint={newPoint}
        picking={adding}
        zoom={16}
        onMapClick={adding ? (lat, lng) => setNewPoint([lat, lng]) : undefined}
      >
        <CropPicker
          crops={crops}
          selected={selectedCrops}
          onChange={setSelectedCrops}
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
            className="absolute top-4 right-4 z-[1100] px-3 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white shadow-lg hover:bg-emerald-500"
            type="button"
            onClick={() => setAdding(true)}
          >
            + Añadir baliza
          </button>
        )}
      </Map>
      <Monitor
        devices={monitor.devices}
        error={monitor.error}
        labels={labels}
        now={monitor.now}
        updatedAt={monitor.updatedAt}
      />
    </section>
  );
}
