"use client";

import { useEffect, useMemo, useState } from "react";

import { CropInfo } from "@/lib/api";

/** Opciones del desplegable de número de zonas. */
export const ZONE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

interface CropPickerProps {
  crops: CropInfo[];
  /** IDs en orden de preferencia. */
  selected: number[];
  zones: number;
  onChange: (ids: number[], zones: number) => void;
}

export default function CropPicker({
  crops,
  selected,
  zones,
  onChange,
}: CropPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>(selected);
  const [draftZones, setDraftZones] = useState(zones);
  const [query, setQuery] = useState("");

  const byId = useMemo(
    () => Object.fromEntries(crops.map((c) => [c.id, c])),
    [crops],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byGroup: Record<string, CropInfo[]> = {};

    crops
      .filter((c) => !q || c.cultivo.toLowerCase().includes(q))
      .forEach((c) => (byGroup[c.grupo] ??= []).push(c));

    return Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b));
  }, [crops, query]);

  const openModal = () => {
    setDraft(selected);
    setDraftZones(zones);
    setQuery("");
    setOpen(true);
  };

  const confirm = () => {
    onChange(draft, draftZones);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = (id: number) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <>
      <button
        className="absolute top-4 left-4 z-[1100] max-w-[calc(100%-12rem)] flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-900/50 bg-[#060e0a] text-sm text-zinc-200 hover:border-emerald-600"
        type="button"
        onClick={openModal}
      >
        <span className="font-semibold text-emerald-400">
          ¿Qué quieres plantar?
        </span>
        {selected.length > 0 && (
          <span className="truncate text-zinc-300">
            {selected.map((id) => byId[id]?.cultivo ?? id).join(" · ")}
          </span>
        )}
        <span className="shrink-0 text-zinc-400">
          {zones} {zones === 1 ? "zona" : "zonas"}
        </span>
        <span aria-hidden className="text-zinc-500">
          ▾
        </span>
      </button>

      {open && (
        <div
          aria-labelledby="crop-picker-title"
          aria-modal="true"
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          role="dialog"
        >
          <button
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60 cursor-default"
            tabIndex={-1}
            type="button"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex flex-col w-full max-w-lg max-h-[80vh] rounded-xl border border-emerald-950/60 bg-[#060e0a]">
            <div className="p-4 space-y-3 border-b border-emerald-950/50">
              <div className="flex items-center justify-between gap-3">
                <h2
                  className="text-lg font-bold text-white"
                  id="crop-picker-title"
                >
                  ¿Qué quieres plantar?
                </h2>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  Número de zonas
                  <select
                    className="px-2 py-1 rounded-lg bg-[#040806] border border-emerald-900/40 text-zinc-200 focus:outline-none focus:border-emerald-600"
                    value={draftZones}
                    onChange={(e) => setDraftZones(Number(e.target.value))}
                  >
                    {ZONE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 min-h-7">
                {draft.length === 0 && (
                  <span className="text-xs text-zinc-600">
                    Ningún cultivo seleccionado
                  </span>
                )}
                {draft.map((id, i) => (
                  <button
                    key={id}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-emerald-900/50 border border-emerald-700/50 text-xs text-emerald-100 hover:bg-emerald-900"
                    title="Quitar"
                    type="button"
                    onClick={() => toggle(id)}
                  >
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-black">
                      {i + 1}
                    </span>
                    {byId[id]?.cultivo ?? id}
                    <span aria-hidden className="text-emerald-400">
                      ×
                    </span>
                  </button>
                ))}
              </div>

              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                aria-label="Buscar cultivo"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#040806] border border-emerald-900/40 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
                placeholder="Buscar cultivo…"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-2">
              {groups.length === 0 && (
                <p className="py-4 text-sm text-zinc-500">
                  {crops.length === 0
                    ? "No hay cultivos disponibles."
                    : "Ningún cultivo coincide con la búsqueda."}
                </p>
              )}
              {groups.map(([grupo, items]) => (
                <div key={grupo}>
                  <p className="sticky top-0 bg-[#060e0a] pt-3 pb-1 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">
                    {grupo}
                  </p>
                  <ul className="grid grid-cols-2 gap-x-2">
                    {items.map((c) => {
                      const rank = draft.indexOf(c.id);

                      return (
                        <li key={c.id}>
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-zinc-300 hover:bg-emerald-950/50 cursor-pointer">
                            <input
                              checked={rank !== -1}
                              className="accent-emerald-500"
                              type="checkbox"
                              onChange={() => toggle(c.id)}
                            />
                            <span className="truncate">{c.cultivo}</span>
                            {rank !== -1 && (
                              <span className="ml-auto text-[10px] font-bold text-emerald-400">
                                #{rank + 1}
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-emerald-950/50">
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 text-sm rounded-lg text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                  disabled={draft.length === 0}
                  type="button"
                  onClick={() => setDraft([])}
                >
                  Limpiar
                </button>
                <button
                  className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                  type="button"
                  onClick={confirm}
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
