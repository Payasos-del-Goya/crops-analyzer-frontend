"use client";

import { useEffect, useState } from "react";

import { getMonitor, MonitorDevice } from "@/lib/api";

const POLL_MS = 30_000;
/** Sin noticias en este tiempo → la baliza se considera desconectada. */
const ONLINE_MS = 3 * 60_000;

function lastSeen(d: MonitorDevice): number | null {
  const times = [d.ultima_lectura, d.ultimo_estado]
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());

  return times.length ? Math.max(...times) : null;
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));

  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;

  return `hace ${Math.round(s / 86400)} d`;
}

function metrics(d: MonitorDevice): [string, string][] {
  const a = d.atmosfera;
  const suelo = d.suelo[0];
  const e = d.estado;
  const out: [string, number | undefined, string, number][] = [
    ["Temp. aire", a.temp_aire, "°C", 1],
    ["Humedad aire", a.hr, "%", 0],
    ["Luz", a.luz_lux, "lx", 0],
    ["Humedad suelo", suelo?.humedad_vol, "%", 0],
    ["CE suelo", suelo?.conductividad, "µS/cm", 0],
    ["Temp. suelo", suelo?.temperatura, "°C", 1],
    ["Lluvia", a.lluvia_mm, "mm", 1],
    ["Batería", e.bateria_v, "V", 2],
    ["Señal", e.rssi, "dBm", 0],
  ];

  return out
    .filter(([, v]) => typeof v === "number")
    .map(([k, v, unit, digits]) => [k, `${v!.toFixed(digits)} ${unit}`]);
}

export default function Monitor({
  labels = {},
}: {
  /** id de baliza → label, para mostrar nombres legibles. */
  labels?: Record<string, string>;
}) {
  const [devices, setDevices] = useState<MonitorDevice[] | null>(null);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getMonitor();

        if (cancelled) return;
        setDevices(data);
        setError(false);
        setUpdatedAt(new Date());
      } catch {
        if (!cancelled) setError(true);
      }
    };

    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 10_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const rows = (devices ?? [])
    .map((d) => {
      const seen = lastSeen(d);

      return { d, seen, online: seen !== null && now - seen < ONLINE_MS };
    })
    .sort(
      (x, y) =>
        Number(y.online) - Number(x.online) ||
        x.d.dispositivo.localeCompare(y.d.dispositivo),
    );
  const onlineCount = rows.filter((r) => r.online).length;

  return (
    <div className="w-80 h-full shrink-0 p-4 rounded-xl border border-emerald-950/50 bg-[#060e0a]/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col gap-3">
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {onlineCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                onlineCount > 0 ? "bg-emerald-500" : "bg-zinc-600"
              }`}
            />
          </span>
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
            Live Monitor
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          {devices ? `${onlineCount}/${rows.length} en línea` : "…"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
        {devices === null && !error && (
          <p className="text-xs text-zinc-500">Cargando lecturas…</p>
        )}
        {devices?.length === 0 && (
          <p className="text-xs text-zinc-500">
            No hay lecturas en las últimas 24 h.
          </p>
        )}
        {rows.map(({ d, seen, online }) => {
          const m = metrics(d);

          return (
            <div
              key={d.dispositivo}
              className={`p-2.5 rounded-lg bg-[#040806] border border-emerald-900/30 ${
                online ? "" : "opacity-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      online ? "bg-emerald-500" : "bg-zinc-600"
                    }`}
                  />
                  <span className="truncate text-sm font-semibold text-zinc-200">
                    {labels[d.dispositivo] || d.dispositivo}
                  </span>
                  {d.tipo === "puente" && (
                    <span className="px-1.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                      puente
                    </span>
                  )}
                  {d.simulado && (
                    <span className="px-1.5 rounded text-[10px] bg-amber-950 text-amber-400">
                      simulado
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-zinc-500">
                  {seen ? ago(now - seen) : "—"}
                </span>
              </div>

              {m.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {m.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[10px] text-zinc-500">{k}</dt>
                      <dd className="text-sm font-mono font-semibold text-emerald-300">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-emerald-950/40 text-[11px] text-zinc-500 flex justify-between items-center">
        <span>InfluxDB</span>
        {error ? (
          <span className="text-red-400">Sin conexión</span>
        ) : (
          <span className="text-emerald-500/80">
            {updatedAt
              ? `Actualizado ${updatedAt.toLocaleTimeString("es-ES")}`
              : "Conectando…"}
          </span>
        )}
      </div>
    </div>
  );
}
