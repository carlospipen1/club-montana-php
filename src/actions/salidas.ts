"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { inscripciones, salidas } from "@/db/schema";
import { requerirCapacidad, requerirUsuario } from "@/lib/auth";
import { notificarA, notificarATodos } from "@/lib/notificar";
import { errorDeValidacion, exito, fallo, type EstadoFormulario } from "./tipos";

const esquemaSalida = z
  .object({
    nombre: z.string().trim().min(3, "Ponle un nombre a la salida."),
    descripcion: z.string().trim().optional(),
    lugar: z.string().trim().optional(),
    fechaSalida: z.string().min(1, "Indica la fecha y hora de salida."),
    fechaLimiteInscripcion: z
      .string()
      .min(1, "Indica hasta cuándo se puede inscribir."),
    nivelDificultad: z.enum(["facil", "medio", "dificil", "experto"]),
    cupoMaximo: z.coerce
      .number()
      .int()
      .min(1, "El cupo debe ser al menos 1.")
      .max(500, "Ese cupo parece un error."),
    equipoRequerido: z.string().trim().optional(),
  })
  .refine((d) => new Date(d.fechaLimiteInscripcion) <= new Date(d.fechaSalida), {
    message: "El cierre de inscripciones debe ser antes o el mismo día de la salida.",
    path: ["fechaLimiteInscripcion"],
  });

export async function accionCrearSalida(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarSalidas");

  const parseado = esquemaSalida.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  const [creada] = await db
    .insert(salidas)
    .values({
      nombre: d.nombre,
      descripcion: d.descripcion || null,
      lugar: d.lugar || null,
      fechaSalida: new Date(d.fechaSalida),
      fechaLimiteInscripcion: new Date(d.fechaLimiteInscripcion),
      nivelDificultad: d.nivelDificultad,
      cupoMaximo: d.cupoMaximo,
      equipoRequerido: d.equipoRequerido || null,
      encargadoId: autor.id,
    })
    .returning({ id: salidas.id });

  await notificarATodos(
    {
      tipo: "salida",
      titulo: "Nueva salida programada",
      mensaje: `${d.nombre}${d.lugar ? ` · ${d.lugar}` : ""}. Inscripciones abiertas, ${d.cupoMaximo} cupos.`,
      enlace: `/panel/salidas#salida-${creada.id}`,
    },
    autor.id,
  );

  revalidatePath("/panel/salidas");
  revalidatePath("/panel");

  return exito(`"${d.nombre}" quedó publicada y se avisó a los socios.`);
}

export async function accionActualizarSalida(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarSalidas");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Salida no válida.", formData);

  const parseado = esquemaSalida.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db
    .update(salidas)
    .set({
      nombre: d.nombre,
      descripcion: d.descripcion || null,
      lugar: d.lugar || null,
      fechaSalida: new Date(d.fechaSalida),
      fechaLimiteInscripcion: new Date(d.fechaLimiteInscripcion),
      nivelDificultad: d.nivelDificultad,
      cupoMaximo: d.cupoMaximo,
      equipoRequerido: d.equipoRequerido || null,
    })
    .where(eq(salidas.id, id));

  revalidatePath("/panel/salidas");
  return exito("Salida actualizada.");
}

export async function accionCambiarEstadoSalida(formData: FormData) {
  await requerirCapacidad("gestionarSalidas");

  const id = Number(formData.get("id"));
  const nuevo = String(formData.get("estado"));

  const validos = ["planificada", "en_curso", "finalizada", "cancelada"] as const;
  if (!Number.isInteger(id) || !validos.includes(nuevo as (typeof validos)[number])) {
    return;
  }

  await db
    .update(salidas)
    .set({ estado: nuevo as (typeof validos)[number] })
    .where(eq(salidas.id, id));

  if (nuevo === "cancelada") {
    const inscritos = await db
      .select({ usuarioId: inscripciones.usuarioId })
      .from(inscripciones)
      .where(eq(inscripciones.salidaId, id));

    const [salida] = await db
      .select({ nombre: salidas.nombre })
      .from(salidas)
      .where(eq(salidas.id, id))
      .limit(1);

    for (const i of inscritos) {
      await notificarA(i.usuarioId, {
        tipo: "salida",
        titulo: "Salida cancelada",
        mensaje: `Se canceló "${salida?.nombre ?? "la salida"}". Disculpa las molestias.`,
        enlace: "/panel/salidas",
      });
    }
  }

  revalidatePath("/panel/salidas");
  revalidatePath("/panel");
}

/* -------------------------------------------------------------------------- */
/*  Inscripciones                                                              */
/* -------------------------------------------------------------------------- */

export async function accionInscribirse(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();

  const salidaId = Number(formData.get("salidaId"));
  if (!Number.isInteger(salidaId)) return fallo("Salida no válida.", formData);

  const [salida] = await db
    .select()
    .from(salidas)
    .where(eq(salidas.id, salidaId))
    .limit(1);

  if (!salida) return fallo("La salida no existe.", formData);
  if (salida.estado !== "planificada") {
    return fallo("Las inscripciones para esta salida están cerradas.", formData);
  }
  if (new Date() > salida.fechaLimiteInscripcion) {
    return fallo("Se pasó la fecha límite de inscripción.", formData);
  }

  try {
    // El cupo se comprueba y la inscripción se inserta dentro de la misma
    // transacción, para que dos socios que aprietan "Inscribirme" a la vez no
    // puedan ocupar ambos el último lugar.
    const resultado = await db.transaction(async (tx) => {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(inscripciones)
        .where(eq(inscripciones.salidaId, salidaId));

      if (total >= salida.cupoMaximo) return "sin-cupo" as const;

      await tx.insert(inscripciones).values({ salidaId, usuarioId: usuario.id });
      return "ok" as const;
    });

    if (resultado === "sin-cupo")
      return fallo("Ya no quedan cupos para esta salida.", formData);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    if (mensaje.includes("duplicate key")) {
      return fallo("Ya estabas inscrito en esta salida.", formData);
    }
    throw error;
  }

  if (salida.encargadoId && salida.encargadoId !== usuario.id) {
    await notificarA(salida.encargadoId, {
      tipo: "salida",
      titulo: "Nueva inscripción",
      mensaje: `${usuario.nombres} ${usuario.apellidos} se inscribió en "${salida.nombre}".`,
      enlace: `/panel/salidas#salida-${salidaId}`,
    });
  }

  revalidatePath("/panel/salidas");
  revalidatePath("/panel");
  revalidatePath("/panel/mi-actividad");

  return exito(`Quedaste inscrito en "${salida.nombre}".`);
}

export async function accionDesinscribirse(formData: FormData) {
  const usuario = await requerirUsuario();

  const salidaId = Number(formData.get("salidaId"));
  if (!Number.isInteger(salidaId)) return;

  await db
    .delete(inscripciones)
    .where(
      and(
        eq(inscripciones.salidaId, salidaId),
        eq(inscripciones.usuarioId, usuario.id),
      ),
    );

  revalidatePath("/panel/salidas");
  revalidatePath("/panel");
  revalidatePath("/panel/mi-actividad");
}

export async function accionMarcarAsistencia(formData: FormData) {
  await requerirCapacidad("gestionarSalidas");

  const inscripcionId = Number(formData.get("inscripcionId"));
  const asistio = formData.get("asistio") === "1";
  if (!Number.isInteger(inscripcionId)) return;

  await db
    .update(inscripciones)
    .set({ asistio })
    .where(eq(inscripciones.id, inscripcionId));

  revalidatePath("/panel/salidas");
}
