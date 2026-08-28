"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { equipos, estadoEquipoEnum, prestamos } from "@/db/schema";
import { requerirCapacidad, requerirUsuario } from "@/lib/auth";
import { CATEGORIAS_EQUIPO } from "@/lib/equipos";
import { notificarA, notificarAQuienesPueden } from "@/lib/notificar";
import { hoyISO } from "@/lib/utils";
import { errorDeValidacion, exito, fallo, type EstadoFormulario } from "./tipos";

/* -------------------------------------------------------------------------- */
/*  Inventario                                                                 */
/* -------------------------------------------------------------------------- */

const esquemaEquipo = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del equipo."),
  // Lista cerrada y compartida con el formulario: ver src/lib/equipos.ts.
  categoria: z.enum(CATEGORIAS_EQUIPO, "Elige una categoría de la lista."),
  descripcion: z.string().trim().optional(),
  estado: z.enum(estadoEquipoEnum.enumValues),
  fechaAdquisicion: z.string().trim().optional(),
});

export async function accionCrearEquipo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarEquipos");

  const parseado = esquemaEquipo.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db.insert(equipos).values({
    nombre: d.nombre,
    categoria: d.categoria,
    descripcion: d.descripcion || null,
    estado: d.estado,
    fechaAdquisicion: d.fechaAdquisicion || hoyISO(),
  });

  await notificarAQuienesPueden(
    "gestionarEquipos",
    {
      tipo: "equipo",
      titulo: "Nuevo equipo en el inventario",
      mensaje: `${autor.nombres} agregó "${d.nombre}" al inventario del club.`,
      enlace: "/panel/equipos",
    },
    autor.id,
  );

  revalidatePath("/panel/equipos");
  return exito(`"${d.nombre}" quedó en el inventario.`);
}

export async function accionActualizarEquipo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarEquipos");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Equipo no válido.", formData);

  const parseado = esquemaEquipo.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db
    .update(equipos)
    .set({
      nombre: d.nombre,
      categoria: d.categoria,
      descripcion: d.descripcion || null,
      estado: d.estado,
      fechaAdquisicion: d.fechaAdquisicion || null,
    })
    .where(eq(equipos.id, id));

  revalidatePath("/panel/equipos");
  return exito("Equipo actualizado.");
}

export async function accionEliminarEquipo(formData: FormData) {
  await requerirCapacidad("gestionarEquipos");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db.delete(equipos).where(eq(equipos.id, id));
  revalidatePath("/panel/equipos");
}

/* -------------------------------------------------------------------------- */
/*  Solicitud de préstamo                                                      */
/* -------------------------------------------------------------------------- */

const esquemaSolicitud = z
  .object({
    equipoId: z.coerce.number().int().positive(),
    fechaDesde: z.string().min(1, "Indica desde cuándo lo necesitas."),
    fechaHasta: z.string().min(1, "Indica hasta cuándo lo necesitas."),
    motivo: z.string().trim().min(5, "Cuenta brevemente para qué lo necesitas."),
  })
  .refine((d) => d.fechaHasta >= d.fechaDesde, {
    message: "La fecha de devolución no puede ser anterior a la de retiro.",
    path: ["fechaHasta"],
  })
  .refine((d) => d.fechaDesde >= hoyISO(), {
    message: "No puedes pedir un equipo para una fecha pasada.",
    path: ["fechaDesde"],
  });

export async function accionSolicitarPrestamo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();

  const parseado = esquemaSolicitud.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { equipoId, fechaDesde, fechaHasta, motivo } = parseado.data;

  const [equipo] = await db
    .select()
    .from(equipos)
    .where(eq(equipos.id, equipoId))
    .limit(1);

  if (!equipo) return fallo("El equipo no existe.", formData);
  if (equipo.estado === "mantencion") {
    return fallo("Ese equipo está en mantención y no se puede prestar.", formData);
  }

  // Se rechaza el choque de fechas con otra solicitud viva sobre el mismo
  // equipo. El sistema anterior no lo comprobaba y permitía comprometer el
  // mismo saco dos veces para el mismo fin de semana.
  const [choque] = await db
    .select({ id: prestamos.id })
    .from(prestamos)
    .where(
      and(
        eq(prestamos.equipoId, equipoId),
        inArray(prestamos.estado, ["pendiente", "aprobado"]),
        lte(prestamos.fechaDesde, fechaHasta),
        gte(prestamos.fechaHasta, fechaDesde),
      ),
    )
    .limit(1);

  if (choque) {
    return fallo(
      "Ese equipo ya está comprometido en esas fechas. Prueba con otro rango.",
      formData,
    );
  }

  await db.insert(prestamos).values({
    equipoId,
    usuarioId: usuario.id,
    fechaDesde,
    fechaHasta,
    motivo,
  });

  await notificarAQuienesPueden("gestionarPrestamos", {
    tipo: "equipo",
    titulo: "Nueva solicitud de préstamo",
    mensaje: `${usuario.nombres} ${usuario.apellidos} pidió "${equipo.nombre}" del ${fechaDesde} al ${fechaHasta}.`,
    enlace: "/panel/prestamos",
  });

  revalidatePath("/panel/equipos");
  revalidatePath("/panel/prestamos");

  return exito("Solicitud enviada. Te avisaremos cuando la revisen.");
}

/* -------------------------------------------------------------------------- */
/*  Resolución de préstamos                                                    */
/* -------------------------------------------------------------------------- */

const esquemaResolucion = z.object({
  prestamoId: z.coerce.number().int().positive(),
  decision: z.enum(["aprobado", "rechazado", "devuelto"]),
  nota: z.string().trim().optional(),
});

export async function accionResolverPrestamo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarPrestamos");

  const parseado = esquemaResolucion.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { prestamoId, decision, nota } = parseado.data;

  const [prestamo] = await db
    .select({
      id: prestamos.id,
      estado: prestamos.estado,
      equipoId: prestamos.equipoId,
      usuarioId: prestamos.usuarioId,
      equipoNombre: equipos.nombre,
    })
    .from(prestamos)
    .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
    .where(eq(prestamos.id, prestamoId))
    .limit(1);

  if (!prestamo) return fallo("La solicitud no existe.", formData);

  if (decision !== "devuelto" && prestamo.estado !== "pendiente") {
    return fallo("Esa solicitud ya fue resuelta.", formData);
  }
  if (decision === "devuelto" && prestamo.estado !== "aprobado") {
    return fallo("Sólo se puede marcar como devuelto un préstamo aprobado.", formData);
  }

  // El préstamo y el estado del equipo cambian juntos o no cambian: si algo
  // falla a medio camino, no queda un equipo "prestado" sin préstamo asociado.
  await db.transaction(async (tx) => {
    await tx
      .update(prestamos)
      .set({
        estado: decision,
        aprobadoPor: autor.id,
        fechaAprobacion: new Date(),
        notaResolucion: nota || null,
      })
      .where(eq(prestamos.id, prestamoId));

    // Rechazar no toca el equipo: la solicitud nunca lo bloqueó. Aprobar lo
    // marca prestado, y la devolución lo libera.
    if (decision === "aprobado") {
      await tx
        .update(equipos)
        .set({ estado: "prestado" })
        .where(eq(equipos.id, prestamo.equipoId));
    } else if (decision === "devuelto") {
      await tx
        .update(equipos)
        .set({ estado: "disponible" })
        .where(eq(equipos.id, prestamo.equipoId));
    }
  });

  const textos = {
    aprobado: {
      titulo: "Tu préstamo fue aprobado",
      mensaje: `Puedes retirar "${prestamo.equipoNombre}".`,
    },
    rechazado: {
      titulo: "Tu solicitud fue rechazada",
      mensaje: `No se aprobó el préstamo de "${prestamo.equipoNombre}".${nota ? ` Motivo: ${nota}` : ""}`,
    },
    devuelto: {
      titulo: "Devolución registrada",
      mensaje: `Se registró la devolución de "${prestamo.equipoNombre}". ¡Gracias!`,
    },
  };

  await notificarA(prestamo.usuarioId, {
    tipo: "equipo",
    ...textos[decision],
    enlace: "/panel/mi-actividad",
  });

  revalidatePath("/panel/prestamos");
  revalidatePath("/panel/equipos");
  revalidatePath("/panel/mi-actividad");

  return exito(
    decision === "aprobado"
      ? "Préstamo aprobado."
      : decision === "rechazado"
        ? "Solicitud rechazada."
        : "Devolución registrada.",
  );
}
