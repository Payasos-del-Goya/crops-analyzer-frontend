export interface Baliza {
  id: string;
  latitud: number;
  longitud: number;
  cultivo_id: number | null;
  label?: string | null;
  /** soto, vega, terraza, regadio, secano, saladar... */
  zona?: string | null;
  textura_suelo?: "arenoso" | "franco" | "arcilloso" | null;
  altitud_m?: number | string | null;
}

/** Usuario con sesión iniciada (GET /me). */
export interface Session {
  usuario: string;
  cliente_id: string;
  nombre: string | null;
}

/** Cookie de sesión que pone el backend en POST /login. */
export const SESSION_COOKIE = "crops_session";

export interface CropInfo {
  id: number;
  grupo: string;
  cultivo: string;
}

export interface BalizaCreate {
  id: string;
  label: string;
  latitud: number;
  longitud: number;
  cultivo_id: number;
}

/** Base del backend para fetch en servidor (Server Components). */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

/** Desde el navegador se pasa por el proxy `/api` definido en next.config.mjs. */
const CLIENT_API = "/api";

function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return "Datos no válidos";

  return `Error ${status}`;
}

/** Sin sesión (o caducada): a la pantalla de inicio de sesión. */
function toLogin(res: Response) {
  if (res.status === 401) window.location.assign("/login");
}

export async function login(usuario: string, password: string): Promise<void> {
  const res = await fetch(`${CLIENT_API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);

    throw new Error(errorMessage(body, res.status));
  }
}

export async function logout(): Promise<void> {
  await fetch(`${CLIENT_API}/logout`, { method: "POST" }).catch(() => null);
}

export async function postBaliza(baliza: BalizaCreate): Promise<void> {
  const res = await fetch(`${CLIENT_API}/balizas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baliza),
  });

  toLogin(res);
  if (!res.ok) {
    const body = await res.json().catch(() => null);

    throw new Error(errorMessage(body, res.status));
  }
}

export interface SondaSuelo {
  profundidad_cm: number | string | null;
  tipo: string | null;
  humedad_vol?: number;
  conductividad?: number;
  temperatura?: number;
  ph?: number;
}

/** Última lectura de una baliza (GET /monitor). */
export interface MonitorDevice {
  dispositivo: string;
  tipo: string | null;
  ultima_lectura: string | null;
  ultimo_estado: string | null;
  simulado: boolean;
  /** Estado del host en Icinga2; null si Icinga no vigila esta baliza. */
  icinga: {
    estado: "UP" | "DOWN" | null;
    alcanzable: boolean | null;
    comprobado: string | null;
  } | null;
  atmosfera: Partial<
    Record<
      | "temp_aire"
      | "hr"
      | "temp_helada"
      | "temp_cubierta"
      | "lluvia_mm"
      | "hoja_mojada_min"
      | "luz_lux",
      number
    >
  >;
  suelo: SondaSuelo[];
  estado: {
    bateria_v?: number;
    rssi?: number;
    sensores_ok?: number;
    uptime_s?: number;
    gateway?: string;
  };
}

export interface MonitorSnapshot {
  dispositivos: MonitorDevice[];
  /** false si el backend no puede leer el estado de Icinga (falta token). */
  icinga_disponible: boolean;
}

export async function getMonitor(): Promise<MonitorSnapshot> {
  const res = await fetch(`${CLIENT_API}/monitor`, { cache: "no-store" });

  toLogin(res);
  if (!res.ok) throw new Error(`Error ${res.status}`);

  return (await res.json()) as MonitorSnapshot;
}

/** URL del WebSocket del monitor (pasa por el mismo proxy `/api`). */
export function monitorSocketUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${proto}//${window.location.host}${CLIENT_API}/ws/monitor`;
}
