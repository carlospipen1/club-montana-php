import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { usuarios, type Usuario } from "@/db/schema";
import { audienciaActual, cookieSesion, firmarSesion, verificarSesion } from "./session";
import { puede, type Capacidad } from "./permisos";

/**
 * Usuario de la request actual, o null si no hay sesión válida.
 *
 * Va envuelto en `cache()` de React para que, aunque el layout, la página y tres
 * componentes lo pidan, se ejecute una sola consulta por request.
 */
export const usuarioActual = cache(async (): Promise<Usuario | null> => {
  const store = await cookies();
  const payload = await verificarSesion(store.get(cookieSesion.nombre)?.value);
  if (!payload) return null;

  // Una cookie de la demostración no vale en el club, ni al revés, aunque los
  // dos despliegues compartieran `AUTH_SECRET`. Ver `audienciaActual()`.
  if (payload.audiencia !== audienciaActual()) return null;

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, payload.userId))
    .limit(1);

  // Un socio desactivado queda fuera de inmediato, sin esperar a que venza el token.
  if (!usuario || usuario.estado !== "activo") return null;

  // Y una contraseña nueva echa a quien tuviera una sesión abierta con la
  // anterior. Se comparan segundos porque `iat` viene redondeado hacia abajo, y
  // el corte es estricto para que la sesión que se emite en el mismo segundo
  // que el cambio —la de quien acaba de cambiar su propia contraseña— sobreviva.
  const corte = Math.floor(usuario.sesionesDesde.getTime() / 1000);
  if (payload.emitidoEn < corte) return null;

  return usuario;
});

/** Exige sesión. Redirige al login si no la hay. */
export async function requerirUsuario(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Exige sesión y una capacidad concreta. */
export async function requerirCapacidad(capacidad: Capacidad): Promise<Usuario> {
  const usuario = await requerirUsuario();
  if (!puede(usuario.rol, capacidad)) redirect("/panel?error=sin-permiso");
  return usuario;
}

export async function iniciarSesion(userId: number): Promise<void> {
  const token = await firmarSesion(userId);
  const store = await cookies();
  store.set(cookieSesion.nombre, token, cookieSesion.opciones);
}

export async function cerrarSesion(): Promise<void> {
  const store = await cookies();
  store.delete(cookieSesion.nombre);
}
