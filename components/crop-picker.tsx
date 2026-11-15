"use client";

import { useEffect, useMemo, useState } from "react";

import { CropInfo } from "@/lib/api";

export const MAX_CROPS = 3;

interface CropPickerProps {
  crops: CropInfo[];
  /** IDs en orden de preferencia (máximo MAX_CROPS). */
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function CropPicker({
  crops,
  selected,
  onChange,
}: CropPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>(selected);
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
    setQuery("");
    setOpen(true);
  };

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = (id: number) =>
    setDraft((d) =>
      d.includes(id)
        ? d.filter((x) => x !== id)
        : d.length < MAX_CROPS
          ? [...d, id]
          : d,
    );

  const full = draft.length >= MAX_CROPS;

  return (
    <>
      <button
        className="absolute top-4 left-4 z-[1100] max-w-[calc(100%-12rem)] flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-900/50 bg-[#060e0a]/90 backdrop-blur-md text-sm text-zinc-200 shadow-lg hover:border-emerald-600"
        type="button"
        onClick={openModal}
      >
        <span className="font-semibold text-emerald-400">
          ¿Qué quieres plantar?
        </span>
        {selected.length > 0 ? (
          <span className="truncate text-zinc-300">
            {selected.map((id) => byId[id]?.cultivo ?? id).join(" · ")}
          </span>
        ) : (
          <span className="text-zinc-500">Elige hasta {MAX_CROPS}</span>
        )}
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
          <div className="relative flex flex-col w-full max-w-lg max-h-[80vh] rounded-xl border border-emerald-950/60 bg-[#060e0a] shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
            <div className="p-4 space-y-3 border-b border-emerald-950/50">
              <div>
                <h2
                  className="text-lg font-bold text-white"
                  id="crop-picker-title"
                >
                  ¿Qué quieres plantar?
                </h2>
                <p className="text-xs text-zinc-400">
                  Elige hasta {MAX_CROPS} cultivos por orden de preferencia.
                </p>
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
                      const disabled = rank === -1 && full;

                      return (
                        <li key={c.id}>
                          <label
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                              disabled
                                ? "text-zinc-600 cursor-not-allowed"
                                : "text-zinc-300 hover:bg-emerald-950/50 cursor-pointer"
                            }`}
                          >
                            <input
                              checked={rank !== -1}
                              className="accent-emerald-500"
                              disabled={disabled}
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

            <div className="flex items-center justify-between gap-2 p-4 border-t border-emerald-950/50">
              <span className="text-xs text-zinc-500">
                {draft.length}/{MAX_CROPS}
                {full && " · máximo alcanzado"}
              </span>
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
