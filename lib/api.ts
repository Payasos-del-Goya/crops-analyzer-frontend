export interface Baliza {
  id: string;
  latitud: number;
  longitud: number;
  cultivo_id: number | null;
  label?: string | null;
}

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

export async function postBaliza(baliza: BalizaCreate): Promise<void> {
  const res = await fetch(`${CLIENT_API}/balizas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baliza),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);

    throw new Error(errorMessage(body, res.status));
  }
}
