"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { asistencias, reuniones, usuarios } from "@/db/schema";
import { requerirCapacidad, requerirUsuario } from "@/lib/auth";
import { notificarATodos } from "@/lib/notificar";
import { desdeHoraChile, formatearCuando } from "@/lib/reuniones";
import { errorDeValidacion, exito, fallo, type EstadoFormulario } from "./tipos";

const esquemaReunion = z.object({
  tipo: z.enum(["asamblea_ordinaria", "asamblea_extraordinaria", "directiva"]),
  titulo: z.string().trim().min(3, "Ponle un título a la reunión."),
  // Lo que envía un <input type="datetime-local">: 2026-09-12T19:00
  fechaHora: z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
      "Indica la fecha y la hora de la reunión.",
    ),
  lugar: z.string().trim().max(200).optional(),
  // El área de texto manda saltos CRLF y esos retornos de carro terminaban
  // visibles dentro del mensaje que se copia a WhatsApp.
  tabla: z
    .string()
    .trim()
    .transform((s) => s.replace(/\r\n/g, "\n"))
    .optional(),
});

/**
 * Convoca una reunión y avisa a todo el club.
 *
 * La notificación interna no reemplaza al aviso por WhatsApp: el club se
 * organiza por ahí, y para eso la pantalla de la reunión ofrece el texto ya
 * armado para copiar y pegar. Esto es para que quede constancia dentro del
 * sistema y aparezca en el inicio de cada socio.
 */
export async function accionConvocarReunion(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarReuniones");

  const parseado = esquemaReunion.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;
  const cuando = desdeHoraChile(d.fechaHora);

  if (Number.isNaN(cuando.getTime())) {
    return fallo("La fecha y hora no son válidas.", formData);
  }

  let creadaId: number;

  try {
    const [creada] = await db
      .insert(reuniones)
      .values({
        tipo: d.tipo,
        titulo: d.titulo,
        fechaHora: cuando,
        lugar: d.lugar || null,
        tabla: d.tabla || null,
        estado: "convocada",
        convocadaPor: autor.id,
        convocadaEn: new Date(),
      })
      .returning({ id: reuniones.id });

    creadaId = creada.id;
  } catch (error) {
    console.error("accionConvocarReunion: falló la creación", error);
    return fallo("No se pudo convocar la reunión.", formData);
  }

  try {
    await notificarATodos(
      {
        tipo: "reunion",
        titulo: "Nueva reunión convocada",
        mensaje: `${d.titulo} · ${formatearCuando(cuando)}${d.lugar ? ` · ${d.lugar}` : ""}`,
        enlace: `/panel/reuniones/${creadaId}`,
      },
      // Quien convoca no necesita que le avisen de su propia convocatoria.
      autor.id,
    );
  } catch (error) {
    // La reunión ya está convocada: que falle el aviso no la deshace.
    console.error("accionConvocarReunion: reunión creada, falló el aviso", error);
  }

  revalidatePath("/panel/reuniones");
  revalidatePath("/panel");
  redirect(`/panel/reuniones/${creadaId}`);
}

export async function accionActualizarReunion(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarReuniones");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Reunión no válida.", formData);

  const parseado = esquemaReunion.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;
  const cuando = desdeHoraChile(d.fechaHora);

  if (Number.isNaN(cuando.getTime())) {
    return fallo("La fecha y hora no son válidas.", formData);
  }

  await db
    .update(reuniones)
    .set({
      tipo: d.tipo,
      titulo: d.titulo,
      fechaHora: cuando,
      lugar: d.lugar || null,
      tabla: d.tabla || null,
      actualizadoEn: new Date(),
    })
    .where(eq(reuniones.id, id));

  revalidatePath("/panel/reuniones");
  revalidatePath(`/panel/reuniones/${id}`);
  revalidatePath("/panel");
  return exito("Reunión actualizada.");
}

/** Cambia el estado: realizada cuando ya ocurrió, cancelada si se suspende. */
export async function accionCambiarEstadoReunion(formData: FormData) {
  await requerirCapacidad("gestionarReuniones");

  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado"));

  if (!Number.isInteger(id)) return;
  if (!["convocada", "realizada", "cancelada"].includes(estado)) return;

  await db
    .update(reuniones)
    .set({
      estado: estado as "convocada" | "realizada" | "cancelada",
      actualizadoEn: new Date(),
    })
    .where(eq(reuniones.id, id));

  revalidatePath("/panel/reuniones");
  revalidatePath(`/panel/reuniones/${id}`);
  revalidatePath("/panel");
}

/**
 * Guarda la lista de asistentes de una reunión.
 *
 * Llega el conjunto completo de marcados, no diferencias: se borra lo anterior
 * y se escribe lo nuevo dentro de una transacción. Es una lista corta y así no
 * hay que razonar sobre qué se agregó y qué se quitó.
 */
export async function accionGuardarAsistencia(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarReuniones");

  const reunionId = Number(formData.get("reunionId"));
  if (!Number.isInteger(reunionId)) return fallo("Reunión no válida.");

  const marcados = formData
    .getAll("asistente")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  // Sólo socios activos: nadie puede aparecer asistiendo por manipular el envío.
  const validos = marcados.length
    ? await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(and(inArray(usuarios.id, marcados), eq(usuarios.estado, "activo")))
    : [];

  await db.transaction(async (tx) => {
    await tx.delete(asistencias).where(eq(asistencias.reunionId, reunionId));

    if (validos.length > 0) {
      await tx
        .insert(asistencias)
        .values(validos.map((v) => ({ reunionId, usuarioId: v.id })));
    }
  });

  revalidatePath(`/panel/reuniones/${reunionId}`);
  return exito(
    validos.length === 1
      ? "Asistencia guardada: 1 persona."
      : `Asistencia guardada: ${validos.length} personas.`,
  );
}

/** Se usa desde el panel para saber si el socio ya puede ver algo. */
export async function hayReunionesVisibles(): Promise<boolean> {
  await requerirUsuario();
  const [alguna] = await db.select({ id: reuniones.id }).from(reuniones).limit(1);
  return Boolean(alguna);
}
