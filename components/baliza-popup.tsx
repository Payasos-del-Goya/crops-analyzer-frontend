import { Baliza, CropInfo, MonitorDevice } from "@/lib/api";
import { ago, deviceStatus, lastSeen, metrics } from "@/lib/monitor";

const STATUS = {
  up: { text: "UP", cls: "bg-emerald-500 text-black" },
  down: { text: "DOWN", cls: "bg-red-500 text-white" },
  unknown: { text: "Sin datos de Icinga", cls: "bg-zinc-700 text-zinc-200" },
};

/** Contenido del popup de una baliza (se renderiza a HTML para Leaflet). */
export default function BalizaPopup({
  baliza,
  crop,
  device,
  now,
}: {
  baliza: Baliza;
  crop?: CropInfo;
  device?: MonitorDevice;
  now: number;
}) {
  const status = STATUS[deviceStatus(device)];
  const seen = device ? lastSeen(device) : null;
  const checked = device?.icinga?.comprobado;
  const e = device?.estado;
  const rows: [string, string][] = [
    ["Cultivo", crop ? `${crop.cultivo} (${crop.grupo})` : "Sin asignar"],
    ["Última lectura", seen ? ago(now - seen) : "Nunca"],
    ...(device ? metrics(device) : []),
  ];

  if (e?.sensores_ok !== undefined)
    rows.push(["Sensores OK", String(e.sensores_ok)]);
  if (e?.uptime_s !== undefined)
    rows.push(["Encendida", ago(e.uptime_s * 1000).replace("hace ", "")]);
  if (e?.gateway && e.gateway !== baliza.id) rows.push(["Puente", e.gateway]);
  rows.push([
    "Posición",
    `${Number(baliza.latitud).toFixed(5)}, ${Number(baliza.longitud).toFixed(5)}`,
  ]);

  return (
    <div className="w-60 font-sans">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            {baliza.label || baliza.id}
          </p>
          <p className="text-[11px] font-mono text-zinc-400">
            {baliza.id}
            {device?.tipo ? ` · ${device.tipo}` : ""}
            {device?.simulado ? " · simulado" : ""}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-bold ${status.cls}`}
        >
          {status.text}
        </span>
      </div>
      {checked && (
        <p className="mt-1 text-[11px] text-zinc-400">
          Icinga · comprobado {ago(now - new Date(checked).getTime())}
          {device?.icinga?.alcanzable === false &&
            " · inalcanzable (falla el puente)"}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-emerald-950/60 pt-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] text-zinc-500">{k}</dt>
            <dd className="text-xs font-mono font-semibold text-emerald-200 break-words">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
