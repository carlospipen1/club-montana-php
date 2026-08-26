import "server-only";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export type Foto = { src: string; alt: string };

/**
 * El `+` final no sobra: Windows suele dejar nombres con la extensión repetida
 * —`foto.jpg.jpeg`— al guardar desde el navegador o al renombrar con la
 * extensión oculta. Sin esto, el sobrante terminaba dentro del pie de foto.
 */
const EXTENSIONES = /(\.(jpe?g|png|webp|avif))+$/i;

/**
 * Fotos de la galería, leídas de `public/galeria/`.
 *
 * No hay lista de archivos que mantener: se deja la foto en la carpeta, se sube
 * al repositorio y aparece en el sitio. La lectura ocurre al compilar, así que
 * la página sigue siendo estática.
 *
 * Convención de nombre — `01-cumbre-del-tolhuaca.jpg`:
 *   - el número inicial ordena y no se muestra;
 *   - el resto se convierte en el texto alternativo de la imagen,
 *     que es lo que lee alguien con baja visión. Vale la pena nombrarlas bien.
 */
export function leerGaleria(): Foto[] {
  let archivos: string[];

  try {
    archivos = readdirSync(join(process.cwd(), "public", "galeria"));
  } catch {
    // La carpeta no existe todavía: la galería simplemente no se muestra.
    return [];
  }

  return archivos
    .filter((nombre) => EXTENSIONES.test(nombre))
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((nombre) => ({
      src: `/galeria/${nombre}`,
      alt: descripcionDesdeNombre(nombre),
    }));
}

/**
 * Palabras que no se capitalizan dentro de un nombre propio: así
 * `cumbre-del-tolhuaca` queda "Cumbre del Tolhuaca" y no "Cumbre Del Tolhuaca".
 * La primera palabra siempre va en mayúscula, aunque esté en esta lista.
 */
const MENORES = new Set([
  "a",
  "al",
  "ante",
  "con",
  "de",
  "del",
  "desde",
  "el",
  "en",
  "entre",
  "hacia",
  "hasta",
  "la",
  "las",
  "lo",
  "los",
  "para",
  "por",
  "sin",
  "sobre",
  "tras",
  "un",
  "una",
  "y",
  "e",
  "o",
  "u",
]);

function descripcionDesdeNombre(nombre: string): string {
  const limpio = nombre
    .replace(EXTENSIONES, "")
    .replace(/^\d+[-_\s]*/, "") // quita el prefijo de orden
    .replace(/[-_]+/g, " ")
    .trim();

  if (!limpio) return "Fotografía del club";

  return limpio
    .split(/\s+/)
    .map((palabra, i) =>
      i > 0 && MENORES.has(palabra.toLowerCase())
        ? palabra.toLowerCase()
        : palabra.charAt(0).toUpperCase() + palabra.slice(1),
    )
    .join(" ");
}
