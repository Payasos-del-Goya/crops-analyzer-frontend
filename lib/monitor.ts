"use client";

import { useEffect, useState } from "react";

import { getMonitor, MonitorDevice } from "./api";

const POLL_MS = 30_000;

/** Sin noticias en este tiempo → sin datos recientes (si Icinga no dice nada). */
export const ONLINE_MS = 3 * 60_000;

export type DeviceStatus = "up" | "down" | "unknown";

/** Icinga manda; si no vigila la baliza, el estado es desconocido. */
export function deviceStatus(d?: MonitorDevice): DeviceStatus {
  if (d?.icinga?.estado === "DOWN") return "down";
  if (d?.icinga?.estado === "UP") return "up";

  return "unknown";
}

export function lastSeen(d: MonitorDevice): number | null {
  const times = [d.ultima_lectura, d.ultimo_estado]
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());

  return times.length ? Math.max(...times) : null;
}

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));

  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;

  return `hace ${Math.round(s / 86400)} d`;
}

export function metrics(d: MonitorDevice): [string, string][] {
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

/** Sondea GET /monitor cada 30 s. */
export function useMonitor() {
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
        setNow(Date.now());
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

  return { devices, error, updatedAt, now };
}
