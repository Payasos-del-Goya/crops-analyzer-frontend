// Solo para Server Components (usa cookies() de next/headers).
import { cookies } from "next/headers";

import { BACKEND_URL, Session, SESSION_COOKIE } from "./api";

export type BackendResult<T> =
  { ok: true; data: T } | { ok: false; unauthorized: boolean };

/**
 * Llamada al backend desde un Server Component reenviando la cookie de sesión
 * del navegador (cada cliente solo recibe sus datos).
 */
export async function backendFetch<T>(path: string): Promise<BackendResult<T>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) return { ok: false, unauthorized: true };
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return { ok: false, unauthorized: res.status === 401 };

    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, unauthorized: false };
  }
}

export async function getSession(): Promise<Session | null> {
  const res = await backendFetch<Session>("/me");

  return res.ok ? res.data : null;
}
