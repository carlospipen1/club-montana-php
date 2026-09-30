"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  certificaciones,
  fichasSocio,
  grupoSanguineoEnum,
  previsionEnum,
} from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { errorDeValidacion, exito, type EstadoFormulario } from "./tipos";

/**
 * La ficha de cada socio la llena el socio, y nadie más.
 *
 * No hay una versión de esto para la directiva a propósito: son datos de salud,
 * y que un tercero los transcriba desde un papel abre la puerta a un error que
 * nadie va a notar hasta que importe. La directiva los lee —con
 * `verFichaMedica`— pero no los escribe.
 */

/** Un campo de texto que vacío significa "no hay dato", no cadena vacía. */
const opcional = (max: number) => z.string().trim().max(max).optional();

const esquemaFicha = z.object({
  // Los valores salen del enum del esquema y no de una lista escrita a mano:
  // agregar uno allá lo habilita acá sin que nadie se acuerde de venir.
  grupoSanguineo: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(grupoSanguineoEnum.enumValues).optional(),
  ),
  alergias: opcional(1000),
  condiciones: opcional(1000),
  medicamentos: opcional(1000),
  prevision: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(previsionEnum.enumValues).optional(),
  ),
  previsionDetalle: opcional(80),
  seguroCompania: opcional(120),
  seguroPoliza: opcional(60),
});

export async function accionGuardarFicha(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();

  const parseado = esquemaFicha.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;
  const valores = {
    grupoSanguineo: d.grupoSanguineo ?? null,
    alergias: d.alergias || null,
    condiciones: d.condiciones || null,
    medicamentos: d.medicamentos || null,
    prevision: d.prevision ?? null,
    // Con Fonasa no hay cuál: guardarlo sería arrastrar un dato que quedó de
    // cuando la persona tenía isapre.
    previsionDetalle: d.prevision === "fonasa" ? null : d.previsionDetalle || null,
    seguroCompania: d.seguroCompania || null,
    seguroPoliza: d.seguroPoliza || null,
    actualizadaEn: new Date(),
  };

  // La ficha se crea sola la primera vez que se guarda: no hay un paso previo
  // de "crear ficha" que la persona tenga que descubrir.
  await db
    .insert(fichasSocio)
    .values({ usuarioId: usuario.id, ...valores })
    .onConflictDoUpdate({ target: fichasSocio.usuarioId, set: valores });

  revalidatePath("/panel/perfil");
  revalidatePath("/panel");
  return exito("Ficha guardada.");
}

/* -------------------------------------------------------------------------- */
/*  Certificaciones                                                            */
/* -------------------------------------------------------------------------- */

const esquemaCertificacion = z
  .object({
    nombre: z.string().trim().min(3, "Escribe el nombre del curso."),
    institucion: opcional(140),
    fechaObtencion: opcional(10),
    fechaVencimiento: opcional(10),
  })
  .refine(
    (d) =>
      !d.fechaObtencion ||
      !d.fechaVencimiento ||
      d.fechaVencimiento >= d.fechaObtencion,
    {
      message: "No puede vencer antes de haberse obtenido.",
      path: ["fechaVencimiento"],
    },
  );

export async function accionAgregarCertificacion(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();

  const parseado = esquemaCertificacion.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db.insert(certificaciones).values({
    usuarioId: usuario.id,
    nombre: d.nombre,
    institucion: d.institucion || null,
    fechaObtencion: d.fechaObtencion || null,
    fechaVencimiento: d.fechaVencimiento || null,
  });

  revalidatePath("/panel/perfil");
  return exito("Curso agregado.");
}

export async function accionEliminarCertificacion(formData: FormData) {
  const usuario = await requerirUsuario();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  // El `and` con el usuario es la autorización, no un filtro de conveniencia:
  // sin él, cualquiera podría borrar el curso de otro cambiando el id.
  await db
    .delete(certificaciones)
    .where(and(eq(certificaciones.id, id), eq(certificaciones.usuarioId, usuario.id)));

  revalidatePath("/panel/perfil");
}
