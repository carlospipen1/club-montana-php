import "server-only";
import { asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { albumes, fotos } from "@/db/schema";

/**
 * Consultas de la parte pública de la galería.
 *
 * Viven aparte de las server actions porque son lecturas que usan tanto la
 * portada como las páginas de álbum, y porque un archivo `"use server"` sólo
 * puede exportar funciones que sean acciones.
 *
 * Un álbum en borrador no existe para el visitante: es material de trabajo.
 */

export async function hayAlbumesPublicados(): Promise<boolean> {
  const [fila] = await db
    .select({ total: count() })
    .from(albumes)
    .where(eq(albumes.estado, "publicado"));

  return (fila?.total ?? 0) > 0;
}

/** Fotos del carrusel de la portada, sólo de álbumes publicados. */
export async function fotosDelCarrusel() {
  return db
    .select({
      id: fotos.id,
      url: fotos.url,
      pie: fotos.pie,
      albumId: fotos.albumId,
    })
    .from(fotos)
    .innerJoin(albumes, eq(fotos.albumId, albumes.id))
    .where(sql`${fotos.enCarrusel} and ${albumes.estado} = 'publicado'`)
    .orderBy(desc(albumes.fecha), asc(fotos.orden));
}

/**
 * Foto de fondo del hero.
 *
 * Si nadie eligió una portada explícita, se usa la primera del carrusel; y si
 * tampoco hay carrusel, quien llame recibe `undefined` y dibuja la cordillera.
 * Así la portada nunca queda rota, ni siquiera el primer día.
 */
export async function fotoDePortada() {
  const [elegida] = await db
    .select({ url: fotos.url, pie: fotos.pie })
    .from(fotos)
    .innerJoin(albumes, eq(fotos.albumId, albumes.id))
    .where(sql`${fotos.esPortadaSitio} and ${albumes.estado} = 'publicado'`)
    .limit(1);

  if (elegida) return elegida;

  const [primeraDelCarrusel] = await fotosDelCarrusel();
  return primeraDelCarrusel
    ? { url: primeraDelCarrusel.url, pie: primeraDelCarrusel.pie }
    : undefined;
}

/** Álbumes publicados, con su portada y cuántas fotos tienen. */
export async function albumesPublicados() {
  return db
    .select({
      id: albumes.id,
      titulo: albumes.titulo,
      fecha: albumes.fecha,
      lugar: albumes.lugar,
      descripcion: albumes.descripcion,
      // Los nombres van escritos completos y no interpolados desde el esquema.
      // Interpolando, Drizzle emite la columna sin calificar —`album_id = id`—
      // y dentro de la subconsulta ambas se resuelven contra `fotos`: la
      // condición pasa a ser `fotos.album_id = fotos.id`, que es cierta por
      // casualidad en alguna fila y devuelve un número plausible pero falso.
      totalFotos: sql<number>`(
        select count(*)::int from fotos where fotos.album_id = albumes.id
      )`,
      portada: sql<string | null>`(
        select fotos.url from fotos
        where fotos.album_id = albumes.id
        order by fotos.es_portada_album desc, fotos.orden asc
        limit 1
      )`,
    })
    .from(albumes)
    .where(eq(albumes.estado, "publicado"))
    .orderBy(desc(albumes.fecha), desc(albumes.id));
}

export async function albumPublicado(id: number) {
  const [album] = await db
    .select()
    .from(albumes)
    .where(sql`${albumes.id} = ${id} and ${albumes.estado} = 'publicado'`)
    .limit(1);

  if (!album) return null;

  const lista = await db
    .select({ id: fotos.id, url: fotos.url, pie: fotos.pie })
    .from(fotos)
    .where(eq(fotos.albumId, id))
    .orderBy(asc(fotos.orden), asc(fotos.id));

  return { album, fotos: lista };
}

/**
 * Siguiente valor de orden para una foto nueva del álbum.
 *
 * No va con las acciones porque no es una acción: es una lectura que usa el
 * endpoint de subida, y exportarla desde un archivo `"use server"` la
 * convertiría además en un endpoint invocable desde el navegador sin necesidad.
 */
export async function siguienteOrden(albumId: number): Promise<number> {
  const [fila] = await db
    .select({ maximo: sql<number>`coalesce(max(${fotos.orden}), -1)::int` })
    .from(fotos)
    .where(eq(fotos.albumId, albumId));

  return (fila?.maximo ?? -1) + 1;
}
