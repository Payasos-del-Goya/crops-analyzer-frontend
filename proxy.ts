import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/api";

/**
 * Sin cookie de sesión → /login. Es solo una comprobación rápida: la sesión
 * la valida el backend en cada llamada (si ha caducado, la página redirige).
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos /login, el proxy /api al backend y los ficheros estáticos.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
