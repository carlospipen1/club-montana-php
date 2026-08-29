"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { actas, reuniones } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { notificarATodos } from "@/lib/notificar";
import {
  errorDeValidacion,
  exito,
  fallo,
  falloDeCampo,
  type EstadoFormulario,
} from "./tipos";

const esquemaActa = z.object({
  /**
   * La reunión de la que se deja constancia. Si viene vacío, se crea una con
   * los datos que el acta ya trae: así redactar el acta de algo que se acordó
   * por teléfono, o cargar un acta vieja en papel, sigue siendo un solo
   * formulario, sin que por eso existan actas huérfanas.
   */
  reunionId: z.coerce.number().int().positive().optional(),
  anio: z.coerce.number().int().min(1990).max(2100),
  numero: z.coerce.number().int().min(1, "El número debe ser 1 o mayor."),
  tipo: z.enum(["asamblea_ordinaria", "asamblea_extraordinaria", "directiva"]),
  titulo: z.string().trim().min(3, "Ponle un título al acta."),
  fecha: z.string().min(1, "Indica la fecha de la reunión."),
  lugar: z.string().trim().optional(),
  cuerpo: z.string().trim().min(20, "El acta está muy corta. Escribe lo tratado."),
});

/** Traduce el choque del índice único a un mensaje sobre el campo correcto. */
function numeroRepetido(error: unknown, formData: FormData): EstadoFormulario | null {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (!mensaje.includes("duplicate key")) return null;

  return falloDeCampo(
    { numero: ["Ya existe un acta con ese número en ese año."] },
    formData,
  );
}

/** Siguiente número disponible del año, para proponerlo en el formulario. */
export async function siguienteNumero(anio: number): Promise<number> {
  const [fila] = await db
    .select({ ultimo: max(actas.numero) })
    .from(actas)
    .where(eq(actas.anio, anio));

  return (fila?.ultimo ?? 0) + 1;
}

export async function accionCrearActa(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarActas");

  const parseado = esquemaActa.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;
  let creadaId: number;

  try {
    creadaId = await db.transaction(async (tx) => {
      let reunionId = d.reunionId;

      if (!reunionId) {
        // Reunión registrada a posteriori: nace ya realizada y sin
        // `convocadaEn`, que es la marca de que nunca se anunció por el
        // sistema. La hora queda al mediodía porque el acta sólo trae la
        // fecha; las pantallas no muestran hora cuando no hubo convocatoria.
        const [reunion] = await tx
          .insert(reuniones)
          .values({
            tipo: d.tipo,
            titulo: d.titulo,
            fechaHora: new Date(`${d.fecha}T12:00:00`),
            lugar: d.lugar || null,
            estado: "realizada",
            convocadaPor: autor.id,
          })
          .returning({ id: reuniones.id });

        reunionId = reunion.id;
      }

      const [creada] = await tx
        .insert(actas)
        .values({
          reunionId,
          anio: d.anio,
          numero: d.numero,
          tipo: d.tipo,
          titulo: d.titulo,
          fecha: d.fecha,
          lugar: d.lugar || null,
          cuerpo: d.cuerpo,
          // Nace como borrador: nadie más la ve hasta que se publique.
          estado: "borrador",
          redactadaPor: autor.id,
          actualizadaPor: autor.id,
        })
        .returning({ id: actas.id });

      return creada.id;
    });
  } catch (error) {
    console.error("accionCrearActa: falló la creación", error);
    return (
      numeroRepetido(error, formData) ?? fallo("No se pudo crear el acta.", formData)
    );
  }

  revalidatePath("/panel/actas");
  redirect(`/panel/actas/${creadaId}`);
}

export async function accionActualizarActa(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarActas");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Acta no válida.", formData);

  const parseado = esquemaActa.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  try {
    await db
      .update(actas)
      .set({
        anio: d.anio,
        numero: d.numero,
        tipo: d.tipo,
        titulo: d.titulo,
        fecha: d.fecha,
        lugar: d.lugar || null,
        cuerpo: d.cuerpo,
        actualizadaPor: autor.id,
        actualizadoEn: new Date(),
      })
      .where(eq(actas.id, id));
  } catch (error) {
    return (
      numeroRepetido(error, formData) ?? fallo("No se pudo guardar el acta.", formData)
    );
  }

  revalidatePath("/panel/actas");
  revalidatePath(`/panel/actas/${id}`);
  return exito("Acta guardada.");
}

/**
 * Publica el acta y avisa a todo el club.
 *
 * Sólo notifica la primera vez: si después se corrige una coma y se vuelve a
 * publicar, no se reenvía el aviso a todos.
 */
export async function accionPublicarActa(formData: FormData) {
  await requerirCapacidad("gestionarActas");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const [acta] = await db.select().from(actas).where(eq(actas.id, id)).limit(1);
  if (!acta || acta.estado === "publicada") return;

  const primeraVez = acta.publicadaEn === null;

  await db
    .update(actas)
    .set({
      estado: "publicada",
      publicadaEn: acta.publicadaEn ?? new Date(),
      actualizadoEn: new Date(),
    })
    .where(eq(actas.id, id));

  if (primeraVez) {
    await notificarATodos({
      tipo: "acta",
      titulo: `Nueva acta publicada: N°${acta.numero} · ${acta.anio}`,
      mensaje: acta.titulo,
      enlace: `/panel/actas/${id}`,
    });
  }

  revalidatePath("/panel/actas");
  revalidatePath(`/panel/actas/${id}`);
}

/** Devuelve un acta publicada a borrador para corregirla sin que el club la vea. */
export async function accionVolverABorrador(formData: FormData) {
  await requerirCapacidad("gestionarActas");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .update(actas)
    .set({ estado: "borrador", actualizadoEn: new Date() })
    .where(eq(actas.id, id));

  revalidatePath("/panel/actas");
  revalidatePath(`/panel/actas/${id}`);
}

/**
 * Sólo se borran borradores. Un acta publicada es parte del registro del club:
 * si estuvo a la vista de los socios, se corrige, no se hace desaparecer.
 */
export async function accionEliminarActa(formData: FormData) {
  await requerirCapacidad("gestionarActas");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db.delete(actas).where(and(eq(actas.id, id), eq(actas.estado, "borrador")));

  revalidatePath("/panel/actas");
  redirect("/panel/actas");
}
