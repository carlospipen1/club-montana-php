import type { Reunion, TipoActa } from "@/db/schema";

export const ETIQUETAS_TIPO_REUNION: Record<TipoActa, string> = {
  asamblea_ordinaria: "Asamblea ordinaria",
  asamblea_extraordinaria: "Asamblea extraordinaria",
  directiva: "Reunión de directiva",
};

/** Fecha y hora en palabras, en horario de Chile. */
export function formatearCuando(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(fecha);
}

/**
 * El texto de la convocatoria, listo para pegar en el grupo de WhatsApp.
 *
 * El club se organiza por ahí, no por el panel: una convocatoria que sólo vive
 * dentro del sistema no convoca a nadie, porque nadie entra a mirar. Esto usa el
 * canal por el que la gente realmente se habla, sin depender de que exista
 * envío de correos.
 */
export function textoConvocatoria(
  reunion: Pick<Reunion, "tipo" | "titulo" | "fechaHora" | "lugar" | "tabla">,
): string {
  const lineas = [
    `📋 ${ETIQUETAS_TIPO_REUNION[reunion.tipo]}`,
    "",
    reunion.titulo,
    "",
    `🗓 ${formatearCuando(new Date(reunion.fechaHora))}`,
  ];

  if (reunion.lugar) lineas.push(`📍 ${reunion.lugar}`);

  if (reunion.tabla) {
    lineas.push("", "Tabla:", reunion.tabla);
  }

  lineas.push("", "Club de Montaña Collipulli");

  return lineas.join("\n");
}
