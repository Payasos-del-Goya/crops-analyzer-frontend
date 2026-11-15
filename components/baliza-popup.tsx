import { Baliza, CropInfo, MonitorDevice } from "@/lib/api";
import { ago, deviceStatus, lastSeen, metrics } from "@/lib/monitor";

// Colores con contraste AA sobre el fondo oscuro del popup.
const STATUS = {
  up: { text: "UP", cls: "bg-emerald-400 text-emerald-950" },
  down: { text: "DOWN", cls: "bg-red-500 text-white" },
  unknown: { text: "SIN DATOS", cls: "bg-zinc-600 text-white" },
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
  const statusKey = deviceStatus(device);
  const status = STATUS[statusKey];
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
          className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${status.cls}`}
        >
          {status.text}
        </span>
      </div>

      <p
        className={`mt-2 text-xs ${
          statusKey === "down" ? "text-red-300" : "text-zinc-300"
        }`}
      >
        {checked
          ? `Icinga · comprobado ${ago(now - new Date(checked).getTime())}`
          : "Icinga no vigila esta baliza"}
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
