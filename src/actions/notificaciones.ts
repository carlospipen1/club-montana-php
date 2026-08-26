"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { notificaciones } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";

/**
 * Marca una notificación como leída.
 *
 * El `and(...)` con el id del usuario es lo que cierra el agujero que tenía el
 * sistema anterior: allí bastaba con enviar cualquier id para marcar (y por lo
 * tanto tocar) notificaciones ajenas. Acá, si la notificación no es tuya, la
 * consulta simplemente no afecta ninguna fila.
 */
export async function accionMarcarLeida(formData: FormData) {
  const usuario = await requerirUsuario();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .update(notificaciones)
    .set({ leida: true })
    .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, usuario.id)));

  revalidatePath("/panel/notificaciones");
  revalidatePath("/panel");
}

export async function accionMarcarTodasLeidas() {
  const usuario = await requerirUsuario();

  await db
    .update(notificaciones)
    .set({ leida: true })
    .where(
      and(eq(notificaciones.usuarioId, usuario.id), eq(notificaciones.leida, false)),
    );

  revalidatePath("/panel/notificaciones");
  revalidatePath("/panel");
}

export async function accionEliminarNotificacion(formData: FormData) {
  const usuario = await requerirUsuario();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .delete(notificaciones)
    .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, usuario.id)));

  revalidatePath("/panel/notificaciones");
  revalidatePath("/panel");
}
