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
    /** Siguiente baliza en el camino hacia el puente (si no se manda, va directa a `gateway`). */
    salto?: string;
    /** Balizas vecinas en la malla, separadas por comas (si se manda, son los enlaces de malla). */
    vecinos?: string;
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

/** Época de siembra de un cultivo en la zona (calendario GGCMI). */
export interface Siembra {
  siembra: string; // MM-DD
  cosecha: string; // MM-DD
  dias_para_siembra: number;
  en_epoca: boolean;
  fuente: string;
}

/** Un cultivo recomendado por el modelo (GET /recomendacion). */
export interface CultivoRecomendado {
  id: number;
  cultivo: string;
  /** cuota × ventaja: el criterio de orden. */
  puntuacion: number;
  /** % de la tierra que dedican a este cultivo las regiones con este clima. */
  cuota_pct: number;
  ventaja: number;
  rendimiento_t_ha: number;
  rendimiento_relativo: number;
  precio_eur_t: number | null;
  precio_relativo: number | null;
  ingreso_bruto_eur_ha: number | null;
  fuente_precio: string | null;
  siembra: Siembra | null;
}

/** Lo plantado ahora en la zona (solo cultivos del modelo) y en cuántas balizas. */
export type CultivoActual = CultivoRecomendado & { balizas: number };

export interface ZonaRecomendacion {
  zona: number;
  balizas: string[];
  centro: { latitud: number; longitud: number };
  /** null si falta el clima de algún mes (Meteomatics caído). */
  variables: Record<string, number | null> | null;
  /** Variables fuera de lo visto al entrenar: el modelo extrapola. */
  fuera_de_rango: string[];
  cultivos_actuales: CultivoActual[];
  cultivos: CultivoRecomendado[];
}

export interface Recomendacion {
  modelo: {
    datos: string;
    cultivos: number;
    sklearn: string;
    entrenado_al_arrancar: boolean;
  };
  meteomatics_disponible: boolean;
  eurostat_disponible: boolean;
  pais: string;
  orden: string;
  fecha: string;
  epoca: string;
  zonas: ZonaRecomendacion[];
}

/** Cultivos recomendados por zona con el modelo entrenado (todos: top=0). */
export async function getRecomendacion(zonas: number): Promise<Recomendacion> {
  const res = await fetch(`${CLIENT_API}/recomendacion?n=${zonas}&top=0`, {
    cache: "no-store",
  });

  toLogin(res);
  if (!res.ok) {
    const body = await res.json().catch(() => null);

    throw new Error(errorMessage(body, res.status));
  }

  return (await res.json()) as Recomendacion;
}
