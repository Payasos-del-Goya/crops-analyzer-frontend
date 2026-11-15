"use client";

import { useEffect, useState } from "react";

import {
  getMonitor,
  MonitorDevice,
  MonitorSnapshot,
  monitorSocketUrl,
} from "./api";

/** Sondeo HTTP de respaldo mientras el WebSocket no está conectado. */
const POLL_MS = 30_000;
const RECONNECT_MAX_MS = 30_000;

/** Sin noticias en este tiempo → sin datos recientes (si Icinga no dice nada). */
export const ONLINE_MS = 3 * 60_000;

export type DeviceStatus = "up" | "down" | "unknown";

/** Estado según Icinga (lo que pinta el marcador en rojo). */
export function deviceStatus(d?: MonitorDevice): DeviceStatus {
  if (d?.icinga?.estado === "DOWN") return "down";
  if (d?.icinga?.estado === "UP") return "up";

  return "unknown";
}

export type Presence = "up" | "down" | "online" | "offline";

/**
 * Estado a mostrar: Icinga si tiene resultado; si no, según la antigüedad
 * del último dato recibido (así no sale "sin datos" cuando sí llegan).
 */
export function devicePresence(
  d: MonitorDevice | undefined,
  now: number,
): Presence {
  const status = deviceStatus(d);

  if (status !== "unknown") return status;
  const seen = d ? lastSeen(d) : null;

  return seen !== null && now - seen < ONLINE_MS ? "online" : "offline";
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

/**
 * Datos del panel en tiempo real: WebSocket `/ws/monitor` (el backend envía
 * cada cambio). Si no conecta o se cae, sondea GET /monitor cada 30 s y
 * reintenta el WebSocket con espera creciente.
 */
export function useMonitor() {
  const [devices, setDevices] = useState<MonitorDevice[] | null>(null);
  const [icingaAvailable, setIcingaAvailable] = useState(true);
  const [error, setError] = useState(false);
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let backoff = 1_000;

    const apply = (data: MonitorSnapshot) => {
      if (cancelled) return;
      setDevices(data.dispositivos ?? []);
      setIcingaAvailable(data.icinga_disponible !== false);
      setError(false);
      setUpdatedAt(new Date());
      setNow(Date.now());
    };

    const load = () =>
      getMonitor()
        .then(apply)
        .catch(() => !cancelled && setError(true));

    const startPolling = () => {
      if (poll) return;
      load();
      poll = setInterval(load, POLL_MS);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(monitorSocketUrl());
      ws.onopen = () => {
        backoff = 1_000;
        setLive(true);
        stopPolling();
      };
      ws.onmessage = (e) => {
        try {
          apply(JSON.parse(e.data) as MonitorSnapshot);
        } catch {
          // mensaje no válido: se ignora
        }
      };
      ws.onclose = () => {
        if (cancelled) return;
        setLive(false);
        startPolling();
        retry = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
      };
    };

    load();
    connect();
    const tick = setInterval(() => setNow(Date.now()), 10_000);

    return () => {
      cancelled = true;
      ws?.close();
      stopPolling();
      if (retry) clearTimeout(retry);
      clearInterval(tick);
    };
  }, []);

  return { devices, icingaAvailable, error, live, updatedAt, now };
}
