"use client";

import { useMemo, useState } from "react";

import BalizaForm from "./baliza-form";
import CropPicker from "./crop-picker";
import Map, { MapMarkerData } from "./map";
import Monitor from "./monitor";

import { Baliza, BalizaCreate, CropInfo } from "@/lib/api";

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

  const markers = useMemo<MapMarkerData[]>(
    () =>
      balizas.map((b) => ({
        lat: b.latitud,
        lng: b.longitud,
        label: b.label || b.id,
      })),
    [balizas],
  );

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
      <Monitor labels={labels} />
    </section>
  );
}
