import { MonitorDevice } from "@/lib/api";
import { ago, deviceStatus, lastSeen, metrics, ONLINE_MS } from "@/lib/monitor";

interface MonitorProps {
  devices: MonitorDevice[] | null;
  error: boolean;
  now: number;
  /** id de baliza → label, para mostrar nombres legibles. */
  labels?: Record<string, string>;
}

export default function Monitor({
  devices,
  error,
  now,
  labels = {},
}: MonitorProps) {
  const rows = (devices ?? [])
    .map((d) => {
      const seen = lastSeen(d);
      const status = deviceStatus(d);
      // Sin Icinga, se usa la antigüedad del último dato.
      const online =
        status === "up" ||
        (status === "unknown" && seen !== null && now - seen < ONLINE_MS);

      return { d, seen, status, online };
    })
    .sort(
      (x, y) =>
        Number(y.status === "down") - Number(x.status === "down") ||
        Number(y.online) - Number(x.online) ||
        Number(!!labels[y.d.dispositivo]) - Number(!!labels[x.d.dispositivo]) ||
        (labels[x.d.dispositivo] || x.d.dispositivo).localeCompare(
          labels[y.d.dispositivo] || y.d.dispositivo,
        ),
    );

  return (
    <div className="w-80 h-full shrink-0 p-4 rounded-xl border border-emerald-950/50 bg-[#060e0a] flex flex-col gap-3">
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
        {devices === null && !error && (
          <p className="text-xs text-zinc-500">Cargando lecturas…</p>
        )}
        {devices?.length === 0 && (
          <p className="text-xs text-zinc-500">
            Ninguna baliza registrada tiene lecturas en las últimas 24 h.
          </p>
        )}
        {rows.map(({ d, seen, status, online }) => {
          const m = metrics(d);
          const down = status === "down";

          return (
            <div
              key={d.dispositivo}
              className={`p-2.5 rounded-lg bg-[#040806] border ${
                down ? "border-red-900/70" : "border-emerald-900/30"
              } ${online || down ? "" : "opacity-50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      down
                        ? "bg-red-500"
                        : online
                          ? "bg-emerald-500"
                          : "bg-zinc-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight text-zinc-100">
                      {labels[d.dispositivo] || d.dispositivo}
                    </p>
                    {labels[d.dispositivo] && (
                      <p className="truncate text-[10px] font-mono text-zinc-400">
                        {d.dispositivo}
                      </p>
                    )}
                  </div>
                  {down && (
                    <span className="px-1.5 rounded text-[10px] font-bold bg-red-500 text-white">
                      DOWN
                    </span>
                  )}
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

      {error && (
        <p className="pt-3 border-t border-emerald-950/40 text-xs text-red-400">
          Sin conexión con el backend
        </p>
      )}
    </div>
  );
}
