import type { FichaSocio } from "@/db/schema";

/**
 * Textos y utilidades de la ficha del socio.
 *
 * Viven acá y no junto a las acciones porque un archivo `"use server"` sólo
 * puede exportar funciones async: cualquier otra cosa rompe el módulo entero.
 */

/** Las opciones tal como se muestran. `no_sabe` es una respuesta, no un vacío. */
export const GRUPOS_SANGUINEOS = [
  { valor: "A+", texto: "A+" },
  { valor: "A-", texto: "A−" },
  { valor: "B+", texto: "B+" },
  { valor: "B-", texto: "B−" },
  { valor: "AB+", texto: "AB+" },
  { valor: "AB-", texto: "AB−" },
  { valor: "O+", texto: "O+" },
  { valor: "O-", texto: "O−" },
  { valor: "no_sabe", texto: "No lo sé" },
] as const;

export const ETIQUETAS_PREVISION: Record<string, string> = {
  fonasa: "Fonasa",
  isapre: "Isapre",
  otra: "Otra",
};

/** Cómo se escribe un grupo sanguíneo cuando se muestra, no cuando se elige. */
export function textoGrupoSanguineo(valor: string | null): string | null {
  if (!valor) return null;
  if (valor === "no_sabe") return "No sabe";
  return GRUPOS_SANGUINEOS.find((g) => g.valor === valor)?.texto ?? valor;
}

/**
 * Los cursos que el club ve seguido, para sugerirlos al escribir.
 *
 * Es una sugerencia y no una lista cerrada: los nombres y las instituciones
 * cambian, y encerrarlos obligaría a una migración cada vez que alguien tome
 * un curso nuevo.
 */
export const CERTIFICACIONES_SUGERIDAS = [
  "Primeros auxilios básicos",
  "WFA · Wilderness First Aid",
  "WFR · Wilderness First Responder",
  "Autorrescate en grietas",
  "Seguridad en avalanchas nivel 1",
  "Escalada en roca nivel 1",
  "Progresión en alta montaña",
  "Rescate vertical",
] as const;

/**
 * Qué falta por llenar.
 *
 * Se usa para el aviso del panel. No incluye todo: sólo lo que de verdad hace
 * falta si hay un accidente. Nadie tiene por qué llenar el número de póliza de
 * un seguro que no tiene, y recordárselo cada vez que entra sería ruido.
 */
export function loQueFaltaEnLaFicha(
  ficha: Pick<FichaSocio, "grupoSanguineo"> | null | undefined,
  contactoNombre: string | null,
): string[] {
  const falta: string[] = [];
  if (!ficha?.grupoSanguineo) falta.push("tu grupo sanguíneo");
  if (!contactoNombre) falta.push("un contacto de emergencia");
  return falta;
}

/** Días que faltan para que venza, o null si no vence. Negativo si ya venció. */
export function diasParaVencer(fechaVencimiento: string | null): number | null {
  if (!fechaVencimiento) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const ms = Date.parse(`${fechaVencimiento}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
