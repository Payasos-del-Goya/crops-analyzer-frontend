"use client";

import { Fragment, useState } from "react";

import {
  CultivoRecomendado,
  Recomendacion as RecomendacionData,
  ZonaRecomendacion,
} from "@/lib/api";

/** Color de cada zona en el mapa y en el panel (ni verde ni rojo: son ok/DOWN). */
export const ZONE_COLORS = [
  "#38bdf8",
  "#f59e0b",
  "#c084fc",
  "#f472b6",
  "#facc15",
  "#2dd4bf",
  "#fb923c",
  "#818cf8",
  "#e2e8f0",
  "#a3e635",
];

export const zoneColor = (zona: number) =>
  ZONE_COLORS[zona % ZONE_COLORS.length];

/** Cultivos que se ven por zona antes de "ver todos". */
const VISIBLE = 5;

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "10-15" → "15 oct". */
function dayMonth(mmdd: string): string {
  const [m, d] = mmdd.split("-").map(Number);

  return `${d} ${MONTHS[m - 1] ?? ""}`;
}

const inSeason = (c: CultivoRecomendado) => Boolean(c.siembra?.en_epoca);

const fmt = (n: number, digits = 0) =>
  n.toLocaleString("es-ES", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function CropRow({
  c,
  rank,
  choice,
}: {
  c: CultivoRecomendado;
  rank: number;
  /** Puesto en las preferencias del usuario (1, 2...), si lo eligió. */
  choice?: number;
}) {
  const s = c.siembra;

  return (
    <li
      className={`px-2 py-1.5 rounded-md ${choice ? "bg-emerald-950/60 border border-emerald-800/60" : "border border-transparent"}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="w-4 shrink-0 text-right text-[11px] text-zinc-500">
          {rank}
        </span>
        <span className="flex-1 min-w-0 truncate text-sm text-zinc-100">
          {c.cultivo}
        </span>
        {choice && (
          <span
            className="shrink-0 text-[10px] font-bold text-emerald-400"
            title="Lo has elegido en «¿Qué quieres plantar?»"
          >
            tu #{choice}
          </span>
        )}
        <span
          className="shrink-0 w-10 text-right text-sm font-mono font-semibold text-emerald-300"
          title="Puntuación = cuota × ventaja"
        >
          {fmt(c.puntuacion, 1)}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 pl-6 text-[11px] text-zinc-400">
        <span title="Parte de la tierra que dedican a este cultivo las regiones con este clima">
          cuota {fmt(c.cuota_pct, 1)} %
        </span>
        <span title="Rendimiento previsto (y frente a la mediana europea)">
          {fmt(c.rendimiento_t_ha, 1)} t/ha
          <span className="text-zinc-500">
            {" "}
            ×{fmt(c.rendimiento_relativo, 2)}
          </span>
        </span>
        {c.precio_eur_t !== null && (
          <span title={c.fuente_precio ?? undefined}>
            {fmt(c.precio_eur_t)} €/t
          </span>
        )}
        {c.ingreso_bruto_eur_ha !== null && (
          <span title="Ingreso bruto: rendimiento × precio, sin costes">
            {fmt(c.ingreso_bruto_eur_ha)} €/ha bruto
          </span>
        )}
      </div>
      {s && (
        <p className="pl-6 text-[11px] text-zinc-500">
          {s.en_epoca ? (
            <span className="text-emerald-400">En época de siembra</span>
          ) : (
            "Siembra"
          )}{" "}
          {dayMonth(s.siembra)} · cosecha {dayMonth(s.cosecha)}
        </p>
      )}
    </li>
  );
}

/** Mejor opción de la zona: la de más puntuación entre todos los cultivos (sin mirar la época). */
export function bestCrop(
  zona: ZonaRecomendacion,
): CultivoRecomendado | undefined {
  return zona.cultivos.reduce<CultivoRecomendado | undefined>(
    (top, c) => (!top || c.puntuacion > top.puntuacion ? c : top),
    undefined,
  );
}

/** Lo plantado ahora en la zona frente a la mejor opción del modelo. */
function Comparison({ zona }: { zona: ZonaRecomendacion }) {
  const best = bestCrop(zona);

  if (!best) return null;
  const bestPlanted = zona.cultivos_actuales.find((c) => c.id === best.id);
  // Balizas de la zona con otro cultivo del modelo (peor puntuado: el mejor es `best`).
  const others = zona.cultivos_actuales
    .filter((c) => c.id !== best.id)
    .reduce((n, c) => n + c.balizas, 0);

  return (
    <div className="rounded-md border border-emerald-900/50 bg-emerald-950/20 text-xs">
      {zona.cultivos_actuales.length > 0 && (
        <div className="px-2.5 py-2 space-y-1 border-b border-emerald-900/40">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
            Hoy
          </p>
          {zona.cultivos_actuales.map((c) => (
            <div key={c.id} className="flex items-baseline gap-2">
              <span className="flex-1 min-w-0 truncate text-zinc-200">
                {c.cultivo}
              </span>
              <span className="shrink-0 text-[11px] text-zinc-500">
                {c.balizas} {c.balizas === 1 ? "baliza" : "balizas"}
              </span>
              <span className="shrink-0 w-9 text-right font-mono font-semibold text-zinc-300">
                {fmt(c.puntuacion, 1)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="px-2.5 py-2 space-y-1">
        <p className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
          Mejor opción
        </p>
        <div className="flex items-baseline gap-2">
          <span className="flex-1 min-w-0 truncate text-sm font-semibold text-zinc-100">
            {best.cultivo}
          </span>
          <span className="shrink-0 w-9 text-right font-mono font-semibold text-emerald-300">
            {fmt(best.puntuacion, 1)}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          {bestPlanted
            ? `Ya está en ${bestPlanted.balizas} ${bestPlanted.balizas === 1 ? "baliza" : "balizas"}${others > 0 ? `; en otras ${others} hay cultivos con menos puntuación` : ""}.`
            : best.siembra
              ? best.siembra.en_epoca
                ? `En época de siembra ahora (${dayMonth(best.siembra.siembra)}).`
                : `Se siembra hacia el ${dayMonth(best.siembra.siembra)}.`
              : "Sin calendario de siembra para este cultivo."}
        </p>
      </div>
    </div>
  );
}

function Zone({
  zona,
  total,
  labels,
  cropNames,
  selected,
}: {
  zona: ZonaRecomendacion;
  total: number;
  labels: Record<string, string>;
  cropNames: Record<number, string>;
  selected: number[];
}) {
  const [all, setAll] = useState(false);
  const shown = all ? zona.cultivos : zona.cultivos.slice(0, VISIBLE);
  const ids = zona.cultivos.map((c) => c.id);
  // Encabezados solo si hay cultivos en época y fuera de ella.
  const grouped =
    zona.cultivos.some(inSeason) && !zona.cultivos.every(inSeason);
  // Elegidos por el usuario (que estén en el modelo) que no se ven en la lista corta.
  const hidden = selected
    .map((id, i) => ({ id, choice: i + 1, rank: ids.indexOf(id) }))
    .filter((x) => x.rank !== -1 && !all && x.rank >= VISIBLE);

  return (
    <div className="p-3 rounded-lg bg-[#040806] border border-emerald-900/30 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ background: zoneColor(zona.zona) }}
        />
        <p className="text-sm font-semibold text-zinc-100">
          {total > 1 ? `Zona ${zona.zona + 1}` : "Toda la finca"}
        </p>
        <span
          className="ml-auto text-[11px] text-zinc-500"
          title={zona.balizas.map((b) => labels[b] || b).join(", ")}
        >
          {zona.balizas.length}{" "}
          {zona.balizas.length === 1 ? "baliza" : "balizas"}
        </span>
      </div>

      {zona.variables !== null && <Comparison zona={zona} />}

      {zona.variables === null ? (
        <p className="text-xs text-amber-400">
          Falta el clima de algún mes (Meteomatics no responde): sin
          recomendación para esta zona.
        </p>
      ) : (
        <>
          <ol className="space-y-0.5">
            {shown.map((c, i) => {
              const choice = selected.indexOf(c.id);
              // El backend pone delante lo que toca sembrar ahora: se separa
              // para que no parezca que un cultivo con poca puntuación gana.
              const header =
                grouped &&
                (i === 0 || inSeason(shown[i - 1]) !== inSeason(c)) &&
                (inSeason(c) ? "Para sembrar ahora" : "Otras épocas");

              return (
                <Fragment key={c.id}>
                  {header && (
                    <li className="pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
                      {header}
                    </li>
                  )}
                  <CropRow
                    c={c}
                    choice={choice === -1 ? undefined : choice + 1}
                    rank={i + 1}
                  />
                </Fragment>
              );
            })}
          </ol>
          {hidden.length > 0 && (
            <p className="text-[11px] text-zinc-400">
              {hidden
                .map(
                  ({ id, choice, rank }) =>
                    `Tu #${choice} ${cropNames[id] ?? id}: puesto ${rank + 1}`,
                )
                .join(" · ")}
            </p>
          )}
          {zona.cultivos.length > VISIBLE && (
            <button
              className="text-[11px] text-emerald-400 hover:text-emerald-300"
              type="button"
              onClick={() => setAll((a) => !a)}
            >
              {all ? "Ver menos" : `Ver los ${zona.cultivos.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface RecomendacionProps {
  data: RecomendacionData | null;
  loading: boolean;
  error: string | null;
  labels: Record<string, string>;
  cropNames: Record<number, string>;
  selected: number[];
}

export default function Recomendacion({
  data,
  loading,
  error,
  labels,
  cropNames,
  selected,
}: RecomendacionProps) {
  if (loading) return <p className="text-xs text-zinc-500">Calculando…</p>;
  if (error) return <p className="text-xs text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-500">
        Ordenado por puntuación = cuota × ventaja (rendimiento y precio aquí
        frente a la media europea). Primero lo que toca sembrar a{" "}
        {new Date(data.fecha).toLocaleDateString("es-ES")}. Precios de Eurostat
        ({data.pais}).
      </p>
      {!data.eurostat_disponible && (
        <p className="text-[11px] text-amber-400">
          Eurostat no responde: sin precios, la ventaja es solo la del
          rendimiento.
        </p>
      )}
      {data.zonas.map((z) => (
        <Zone
          key={z.zona}
          cropNames={cropNames}
          labels={labels}
          selected={selected}
          total={data.zonas.length}
          zona={z}
        />
      ))}
    </div>
  );
}
