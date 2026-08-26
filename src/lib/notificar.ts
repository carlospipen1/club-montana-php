import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { notificaciones, tipoNotificacionEnum, usuarios } from "@/db/schema";
import { CAPACIDADES, type Capacidad } from "./permisos";

/**
 * Los tipos se derivan del enum del esquema en vez de repetirse a mano: agregar
 * una categoría nueva a la base la deja disponible aquí sin tocar este archivo.
 */
type Aviso = {
  tipo: (typeof tipoNotificacionEnum.enumValues)[number];
  titulo: string;
  mensaje: string;
  enlace?: string;
};

/** Notifica a un socio concreto. */
export async function notificarA(usuarioId: number, aviso: Aviso) {
  await db.insert(notificaciones).values({ usuarioId, ...aviso });
}

/** Notifica a varios socios de una vez. */
export async function notificarAVarios(usuarioIds: number[], aviso: Aviso) {
  if (usuarioIds.length === 0) return;
  await db
    .insert(notificaciones)
    .values(usuarioIds.map((usuarioId) => ({ usuarioId, ...aviso })));
}

/**
 * Notifica a quienes tengan una capacidad determinada (por ejemplo, avisar a
 * los encargados de equipo de una nueva solicitud de préstamo).
 */
export async function notificarAQuienesPueden(
  capacidad: Capacidad,
  aviso: Aviso,
  excluirUsuarioId?: number,
) {
  const roles = CAPACIDADES[capacidad];

  const destinatarios = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(
      and(
        inArray(usuarios.rol, [...roles]),
        eq(usuarios.estado, "activo"),
        excluirUsuarioId ? ne(usuarios.id, excluirUsuarioId) : undefined,
      ),
    );

  await notificarAVarios(
    destinatarios.map((d) => d.id),
    aviso,
  );
}

/** Notifica a todos los socios activos. */
export async function notificarATodos(aviso: Aviso, excluirUsuarioId?: number) {
  const destinatarios = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.estado, "activo"),
        excluirUsuarioId ? ne(usuarios.id, excluirUsuarioId) : undefined,
      ),
    );

  await notificarAVarios(
    destinatarios.map((d) => d.id),
    aviso,
  );
}
