import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type ArchivoGuardado = {
  /** URL pública con la que se muestra la foto. */
  url: string;
  /** Ruta interna del proveedor. Es lo que hace falta para borrar el archivo. */
  ruta: string;
};

/**
 * Guardado de archivos subidos.
 *
 * En producción usa Vercel Blob: el sistema de archivos de Vercel es de sólo
 * lectura, así que no hay alternativa. En desarrollo, si no hay token
 * configurado, escribe en `public/subidas/` para poder trabajar sin depender de
 * un servicio externo.
 *
 * Ojo con eso último: la base de datos es la misma en local y en producción, de
 * modo que una foto subida en desarrollo queda registrada con una URL
 * `/subidas/...` que en el sitio publicado no existe. Sirve para probar; las
 * fotos de verdad hay que subirlas con el token puesto.
 */
function usaBlob() {
  // Hay dos formas de autenticarse contra el store, y ambas cuentan:
  //
  // - En Vercel el store va conectado al proyecto por OIDC. No existe ningún
  //   token de lectura/escritura: la plataforma inyecta `BLOB_STORE_ID` y un
  //   token OIDC de vida corta que el SDK toma solo.
  // - En local no hay OIDC, así que se usa el `BLOB_READ_WRITE_TOKEN` del store.
  //
  // Mirar solo el token daba un falso negativo en producción: el sitio creía
  // estar en modo desarrollo e intentaba escribir en un disco de solo lectura.
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function almacenamientoEsPersistente() {
  return usaBlob();
}

const CARPETA_LOCAL = join(process.cwd(), "public", "subidas");

export async function guardarArchivo(
  nombreOriginal: string,
  datos: Buffer,
  tipo: string,
): Promise<ArchivoGuardado> {
  const extension = (nombreOriginal.split(".").pop() ?? "jpg").toLowerCase();
  // Nombre único: dos fotos distintas pueden llamarse "IMG_1234.jpg".
  const nombre = `${randomUUID()}.${extension}`;

  if (usaBlob()) {
    const { put } = await import("@vercel/blob");
    const ruta = `galeria/${nombre}`;
    const { url } = await put(ruta, datos, {
      access: "public",
      contentType: tipo,
      // El nombre ya es único; añadir sufijo aleatorio sólo estorbaría al borrar.
      addRandomSuffix: false,
    });
    return { url, ruta };
  }

  await mkdir(CARPETA_LOCAL, { recursive: true });
  await writeFile(join(CARPETA_LOCAL, nombre), datos);
  return { url: `/subidas/${nombre}`, ruta: `local:${nombre}` };
}

/**
 * Borra el archivo. Nunca lanza: si el archivo ya no está, el objetivo —que
 * deje de existir— igual se cumple, y no tiene sentido impedir que se borre el
 * registro de la base por eso.
 */
export async function eliminarArchivo(ruta: string | null): Promise<void> {
  if (!ruta) return;

  try {
    if (ruta.startsWith("local:")) {
      await unlink(join(CARPETA_LOCAL, ruta.slice("local:".length)));
      return;
    }

    const { del } = await import("@vercel/blob");
    await del(ruta);
  } catch (error) {
    console.warn(`No se pudo borrar el archivo ${ruta}:`, error);
  }
}
