import { NextResponse, type NextRequest } from "next/server";
import { cookieSesion, verificarSesion } from "@/lib/session";

/**
 * Portero de la intranet.
 *
 * Sólo comprueba que la cookie tenga una firma válida: es un chequeo barato que
 * corre en el edge y evita renderizar páginas privadas a un visitante anónimo.
 * La autorización de verdad (rol, estado del socio) la hace cada página con
 * `requerirUsuario` / `requerirCapacidad`, que sí consultan la base de datos.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(cookieSesion.nombre)?.value;
  const sesion = await verificarSesion(token);

  if (!sesion) {
    const login = new URL("/login", request.url);
    // Para volver a donde iba después de autenticarse.
    login.searchParams.set("siguiente", request.nextUrl.pathname);
    const respuesta = NextResponse.redirect(login);
    if (token) respuesta.cookies.delete(cookieSesion.nombre);
    return respuesta;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"],
};
