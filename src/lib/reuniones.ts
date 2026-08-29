import type { Reunion, TipoActa } from "@/db/schema";

export const ETIQUETAS_TIPO_REUNION: Record<TipoActa, string> = {
  asamblea_ordinaria: "Asamblea ordinaria",
  asamblea_extraordinaria: "Asamblea extraordinaria",
  directiva: "Reunión de directiva",
};

const ZONA = "America/Santiago";

/** Cuánto se desvía Chile de UTC en un instante dado, en milisegundos. */
function desfaseChile(instante: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);

  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  const comoSiFueraUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );

  return comoSiFueraUTC - instante.getTime();
}

/**
 * Convierte lo que escribe un `<input type="datetime-local">` al instante real.
 *
 * El campo entrega un reloj de pared —"2026-10-09T20:00"— sin zona horaria, y
 * `new Date()` lo interpreta en la zona del servidor. En Vercel eso es UTC, así
 * que una reunión a las 20:00 quedaba guardada como las 17:00 de Chile. Quien
 * escribe la hora está pensando en la hora de acá, siempre.
 */
export function desdeHoraChile(valor: string): Date {
  const tentativo = new Date(`${valor}Z`);
  if (Number.isNaN(tentativo.getTime())) return tentativo;

  return new Date(tentativo.getTime() - desfaseChile(tentativo));
}

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
