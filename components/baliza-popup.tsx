import { Baliza, MonitorDevice } from "@/lib/api";
import {
  ago,
  devicePresence,
  lastSeen,
  metrics,
  Presence,
} from "@/lib/monitor";

// Colores con contraste AA sobre el fondo oscuro del popup.
const PRESENCE: Record<Presence, { text: string; cls: string }> = {
  up: { text: "UP", cls: "bg-emerald-400 text-emerald-950" },
  down: { text: "DOWN", cls: "bg-red-500 text-white" },
  online: { text: "EN LÍNEA", cls: "bg-emerald-400 text-emerald-950" },
  offline: { text: "SIN SEÑAL", cls: "bg-zinc-600 text-white" },
};

/** Contenido del popup de una baliza (se renderiza a HTML para Leaflet). */
export default function BalizaPopup({
  baliza,
  cropName,
  device,
  icingaAvailable,
  now,
}: {
  baliza: Baliza;
  /** Cultivo plantado (de `cultivos`), si la baliza tiene uno asignado. */
  cropName?: string;
  device?: MonitorDevice;
  /** false si el backend no puede leer Icinga. */
  icingaAvailable: boolean;
  now: number;
}) {
  const presence = devicePresence(device, now);
  const badge = PRESENCE[presence];
  const seen = device ? lastSeen(device) : null;
  const checked = device?.icinga?.comprobado;
  const e = device?.estado;
  const terrain = [
    baliza.zona,
    baliza.textura_suelo,
    baliza.altitud_m != null
      ? `${Math.round(Number(baliza.altitud_m))} m`
      : null,
  ].filter(Boolean);
  const rows: [string, string][] = [];

  if (cropName) rows.push(["Cultivo", cropName]);
  if (terrain.length) rows.push(["Terreno", terrain.join(" · ")]);
  rows.push(
    ["Última lectura", seen ? ago(now - seen) : "Nunca"],
    ...(device ? metrics(device) : []),
  );

  if (e?.sensores_ok !== undefined)
    rows.push(["Sensores OK", String(e.sensores_ok)]);
  if (e?.uptime_s !== undefined)
    rows.push(["Encendida", ago(e.uptime_s * 1000).replace("hace ", "")]);
  if (e?.gateway && e.gateway !== baliza.id) rows.push(["Puente", e.gateway]);

  let source: string;

  if (checked)
    source = `Icinga · comprobado ${ago(now - new Date(checked).getTime())}`;
  else if (!icingaAvailable)
    source = "Estado de Icinga no disponible · según los datos recibidos";
  else source = "Sin resultado reciente de Icinga · según los datos recibidos";

  return (
    <div className="w-64 font-sans text-zinc-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight text-white">
            {baliza.label || baliza.id}
          </p>
          <p className="mt-0.5 text-xs font-mono text-zinc-300">
            {baliza.id}
            {device?.tipo ? ` · ${device.tipo}` : ""}
            {device?.simulado ? " · simulado" : ""}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${badge.cls}`}
        >
          {badge.text}
        </span>
      </div>

      <p
        className={`mt-2 text-xs ${
          presence === "down" ? "text-red-300" : "text-zinc-300"
        }`}
      >
        {source}
        {device?.icinga?.alcanzable === false &&
          " · inalcanzable (falla el puente)"}
      </p>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/15 pt-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-zinc-400">{k}</dt>
            <dd className="text-[13px] font-mono font-semibold text-emerald-200 break-words">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
