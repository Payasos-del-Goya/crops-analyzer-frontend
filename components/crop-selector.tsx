"use client";

import { useMemo, useState } from "react";

import { CropInfo } from "@/lib/api";

interface CropSelectorProps {
  crops: CropInfo[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function CropSelector({
  crops,
  selected,
  onChange,
}: CropSelectorProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byGroup: Record<string, CropInfo[]> = {};

    crops
      .filter((c) => !q || c.cultivo.toLowerCase().includes(q))
      .forEach((c) => (byGroup[c.grupo] ??= []).push(c));

    return Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b));
  }, [crops, query]);

  const selectedSet = new Set(selected);

  const toggle = (id: number) =>
    onChange(
      selectedSet.has(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );

  return (
    <aside className="w-64 h-full shrink-0 p-4 rounded-xl border border-emerald-950/50 bg-[#060e0a]/90 shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col gap-3">
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
        <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
          Cultivos
        </span>
        {selected.length > 0 && (
          <button
            className="text-[11px] text-zinc-400 hover:text-emerald-400"
            type="button"
            onClick={() => onChange([])}
          >
            Limpiar ({selected.length})
          </button>
        )}
      </div>

      <input
        aria-label="Buscar cultivo"
        className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-[#040806] border border-emerald-900/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
        placeholder="Buscar cultivo…"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
        {crops.length === 0 && (
          <p className="text-xs text-zinc-500">No hay cultivos disponibles.</p>
        )}
        {groups.map(([grupo, items]) => (
          <details
            key={grupo}
            className="group"
            open={query.trim() !== "" || undefined}
          >
            <summary className="cursor-pointer select-none text-xs font-semibold text-zinc-400 hover:text-zinc-200 py-1">
              {grupo}{" "}
              <span className="text-zinc-600">
                ({items.filter((c) => selectedSet.has(c.id)).length}/
                {items.length})
              </span>
            </summary>
            <ul className="mt-1 space-y-0.5">
              {items.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 px-1.5 py-1 rounded text-sm text-zinc-300 hover:bg-emerald-950/40 cursor-pointer">
                    <input
                      checked={selectedSet.has(c.id)}
                      className="accent-emerald-500"
                      type="checkbox"
                      onChange={() => toggle(c.id)}
                    />
                    {c.cultivo}
                  </label>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </aside>
  );
}
