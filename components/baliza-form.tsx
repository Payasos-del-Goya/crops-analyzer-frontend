"use client";

import { FormEvent, useState } from "react";

import { BalizaCreate, CropInfo, postBaliza } from "@/lib/api";

interface BalizaFormProps {
  crops: CropInfo[];
  point: [number, number] | null;
  onPointChange: (point: [number, number] | null) => void;
  onCreated: (baliza: BalizaCreate) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full px-2.5 py-1.5 text-sm rounded-lg bg-[#040806] border border-emerald-900/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600";

export default function BalizaForm({
  crops,
  point,
  onPointChange,
  onCreated,
  onCancel,
}: BalizaFormProps) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [cultivoId, setCultivoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setCoord = (index: 0 | 1, value: string) => {
    const n = Number(value);

    if (value === "" || Number.isNaN(n)) return;
    const next: [number, number] = point ? [...point] : [0, 0];

    next[index] = n;
    onPointChange(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!point) return setError("Haz click en el mapa para fijar la posición.");

    const baliza: BalizaCreate = {
      id: id.trim(),
      label: label.trim(),
      latitud: point[0],
      longitud: point[1],
      cultivo_id: Number(cultivoId),
    };

    setSubmitting(true);
    setError(null);
    try {
      await postBaliza(baliza);
      onCreated(baliza);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="absolute top-4 right-4 z-[1100] w-72 p-4 rounded-xl border border-emerald-950/50 bg-[#060e0a]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.6)] space-y-3"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
          Nueva baliza
        </span>
        <span className="text-[11px] text-zinc-500">Click en el mapa</span>
      </div>

      <input
        required
        aria-label="ID"
        className={inputClass}
        placeholder="ID (p. ej. nodo-03)"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />
      <input
        aria-label="Label"
        className={inputClass}
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <select
        required
        aria-label="Cultivo"
        className={inputClass}
        value={cultivoId}
        onChange={(e) => setCultivoId(e.target.value)}
      >
        <option disabled value="">
          Cultivo…
        </option>
        {crops.map((c) => (
          <option key={c.id} value={c.id}>
            {c.cultivo} ({c.grupo})
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          aria-label="Latitud"
          className={inputClass}
          max={90}
          min={-90}
          placeholder="Latitud"
          step="any"
          type="number"
          value={point?.[0] ?? ""}
          onChange={(e) => setCoord(0, e.target.value)}
        />
        <input
          required
          aria-label="Longitud"
          className={inputClass}
          max={180}
          min={-180}
          placeholder="Longitud"
          step="any"
          type="number"
          value={point?.[1] ?? ""}
          onChange={(e) => setCoord(1, e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          className="px-3 py-1.5 text-sm rounded-lg text-zinc-400 hover:text-zinc-200"
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
