"use server";

import { and, asc, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { albumes, fotos } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { eliminarArchivo } from "@/lib/almacenamiento";
import { MAXIMO_CARRUSEL } from "@/lib/galeria";
import { errorDeValidacion, exito, fallo, type EstadoFormulario } from "./tipos";

/* -------------------------------------------------------------------------- */
/*  Álbumes                                                                    */
/* -------------------------------------------------------------------------- */

const esquemaAlbum = z.object({
  titulo: z.string().trim().min(3, "Ponle un título al álbum."),
  fecha: z.string().min(1, "Indica la fecha."),
  lugar: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
});

export async function accionCrearAlbum(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarGaleria");

  const parseado = esquemaAlbum.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  const [creado] = await db
    .insert(albumes)
    .values({
      titulo: d.titulo,
      fecha: d.fecha,
      lugar: d.lugar || null,
      descripcion: d.descripcion || null,
      estado: "borrador",
      creadoPor: autor.id,
    })
    .returning({ id: albumes.id });

  revalidatePath("/panel/galeria");
  redirect(`/panel/galeria/${creado.id}`);
}

export async function accionActualizarAlbum(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Álbum no válido.", formData);

  const parseado = esquemaAlbum.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db
    .update(albumes)
    .set({
      titulo: d.titulo,
      fecha: d.fecha,
      lugar: d.lugar || null,
      descripcion: d.descripcion || null,
      actualizadoEn: new Date(),
    })
    .where(eq(albumes.id, id));

  revalidatePath("/panel/galeria");
  revalidatePath(`/panel/galeria/${id}`);
  revalidatePath("/galeria");
  return exito("Álbum guardado.");
}

export async function accionPublicarAlbum(formData: FormData) {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  const publicar = formData.get("publicar") === "1";
  if (!Number.isInteger(id)) return;

  await db
    .update(albumes)
    .set({ estado: publicar ? "publicado" : "borrador", actualizadoEn: new Date() })
    .where(eq(albumes.id, id));

  revalidarTodo(id);
}

export async function accionEliminarAlbum(formData: FormData) {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  // Los archivos hay que borrarlos uno a uno antes: el ON DELETE CASCADE limpia
  // la base, pero no sabe nada del proveedor de almacenamiento.
  const archivos = await db
    .select({ ruta: fotos.rutaAlmacenamiento })
    .from(fotos)
    .where(eq(fotos.albumId, id));

  await Promise.all(archivos.map((a) => eliminarArchivo(a.ruta)));
  await db.delete(albumes).where(eq(albumes.id, id));

  revalidarTodo();
  redirect("/panel/galeria");
}

/* -------------------------------------------------------------------------- */
/*  Fotos                                                                      */
/* -------------------------------------------------------------------------- */

export async function accionGuardarPie(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Foto no válida.", formData);

  const pie = String(formData.get("pie") ?? "").trim();

  const [actualizada] = await db
    .update(fotos)
    .set({ pie: pie || null })
    .where(eq(fotos.id, id))
    // Se pide el álbum de vuelta para poder revalidar su página: sin eso, el
    // contador de "fotos sin pie" de la cabecera se quedaba con el número viejo.
    .returning({ albumId: fotos.albumId });

  revalidarTodo(actualizada?.albumId);
  return exito("Pie guardado.");
}

export async function accionEliminarFoto(formData: FormData) {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const [foto] = await db.select().from(fotos).where(eq(fotos.id, id)).limit(1);
  if (!foto) return;

  await db.delete(fotos).where(eq(fotos.id, id));
  await eliminarArchivo(foto.rutaAlmacenamiento);

  revalidarTodo(foto.albumId);
}

/** Sube o baja una foto dentro de su álbum, intercambiándola con la vecina. */
export async function accionMoverFoto(formData: FormData) {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  const direccion = formData.get("direccion") === "arriba" ? -1 : 1;
  if (!Number.isInteger(id)) return;

  const [foto] = await db.select().from(fotos).where(eq(fotos.id, id)).limit(1);
  if (!foto) return;

  const hermanas = await db
    .select({ id: fotos.id, orden: fotos.orden })
    .from(fotos)
    .where(eq(fotos.albumId, foto.albumId))
    .orderBy(asc(fotos.orden), asc(fotos.id));

  const posicion = hermanas.findIndex((f) => f.id === id);
  const destino = posicion + direccion;
  if (destino < 0 || destino >= hermanas.length) return;

  // Se reescriben todos los órdenes: los valores guardados pueden venir
  // repetidos o con huecos, y así quedan siempre 0..n-1 consecutivos.
  const reordenadas = [...hermanas];
  [reordenadas[posicion], reordenadas[destino]] = [
    reordenadas[destino],
    reordenadas[posicion],
  ];

  await db.transaction(async (tx) => {
    for (const [i, f] of reordenadas.entries()) {
      await tx.update(fotos).set({ orden: i }).where(eq(fotos.id, f.id));
    }
  });

  revalidarTodo(foto.albumId);
}

/* -------------------------------------------------------------------------- */
/*  Dónde aparece cada foto                                                    */
/* -------------------------------------------------------------------------- */

/** Portada del álbum: exactamente una por álbum. */
export async function accionPortadaAlbum(formData: FormData) {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const [foto] = await db.select().from(fotos).where(eq(fotos.id, id)).limit(1);
  if (!foto) return;

  await db.transaction(async (tx) => {
    await tx
      .update(fotos)
      .set({ esPortadaAlbum: false })
      .where(and(eq(fotos.albumId, foto.albumId), ne(fotos.id, id)));
    await tx.update(fotos).set({ esPortadaAlbum: true }).where(eq(fotos.id, id));
  });

  revalidarTodo(foto.albumId);
}

/** Portada del sitio: exactamente una en todo el sistema. */
export async function accionPortadaSitio(formData: FormData) {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const [foto] = await db.select().from(fotos).where(eq(fotos.id, id)).limit(1);
  if (!foto) return;

  await db.transaction(async (tx) => {
    await tx
      .update(fotos)
      .set({ esPortadaSitio: false })
      .where(eq(fotos.esPortadaSitio, true));
    await tx.update(fotos).set({ esPortadaSitio: true }).where(eq(fotos.id, id));
  });

  revalidarTodo(foto.albumId);
}

/**
 * Añade o quita una foto del carrusel.
 *
 * El tope se comprueba en el servidor y no sólo escondiendo el botón: si la
 * pantalla quedó abierta desde antes, el conteo que vio puede estar viejo.
 */
export async function accionAlternarCarrusel(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarGaleria");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Foto no válida.");

  const [foto] = await db.select().from(fotos).where(eq(fotos.id, id)).limit(1);
  if (!foto) return fallo("La foto no existe.");

  if (!foto.enCarrusel) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(fotos)
      .where(eq(fotos.enCarrusel, true));

    if (total >= MAXIMO_CARRUSEL) {
      return fallo(
        `El carrusel ya tiene ${MAXIMO_CARRUSEL} fotos, que es el máximo. Quita una antes de agregar otra.`,
      );
    }
  }

  await db.update(fotos).set({ enCarrusel: !foto.enCarrusel }).where(eq(fotos.id, id));

  revalidarTodo(foto.albumId);

  return exito(foto.enCarrusel ? "Quitada del carrusel." : "Agregada al carrusel.");
}

/* -------------------------------------------------------------------------- */

function revalidarTodo(albumId?: number) {
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/panel/galeria");
  if (albumId) {
    revalidatePath(`/galeria/${albumId}`);
    revalidatePath(`/panel/galeria/${albumId}`);
  }
}
