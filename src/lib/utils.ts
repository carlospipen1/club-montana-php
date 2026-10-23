import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ZONA = "America/Santiago";

/** Pesos chilenos, sin decimales: 5000 -> "$5.000". */
export function formatearCLP(monto: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(monto);
}

/** "12 de marzo de 2026" */
export function formatearFecha(fecha: Date | string | null): string {
  if (!fecha) return "—";
  const d = typeof fecha === "string" ? new Date(`${fecha}T12:00:00`) : fecha;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONA,
  }).format(d);
}

/** "12 mar 2026, 08:30" */
export function formatearFechaHora(fecha: Date | string | null): string {
  if (!fecha) return "—";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  }).format(d);
}

/** "hace 3 días", "en 2 horas" */
export function tiempoRelativo(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const segundos = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

  const tramos: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unidad, seg] of tramos) {
    if (Math.abs(segundos) >= seg) {
      return rtf.format(Math.round(segundos / seg), unidad);
    }
  }
  return "recién";
}

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Fecha de hoy en formato "YYYY-MM-DD" según la zona horaria de Chile. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

/**
 * Convierte una fecha al formato que espera <input type="datetime-local">
 * ("YYYY-MM-DDTHH:mm"), expresada en hora de Chile.
 */
export function paraInputFechaHora(fecha: Date | string | null): string {
  if (!fecha) return "";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return "";

  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  // "sv-SE" entrega "2026-03-12 08:30"; el input necesita la T.
  return partes.replace(" ", "T");
}

/**
 * Días completos de atraso respecto a una fecha "YYYY-MM-DD".
 * Devuelve 0 si la fecha es hoy o está en el futuro.
 *
 * Compara cadenas de fecha en vez de objetos Date para no arrastrar la hora:
 * un préstamo que vence "el 12" está atrasado desde el 13 a las 00:00 en Chile,
 * sin importar en qué zona horaria corra el servidor.
 */
export function diasDeAtraso(fechaHasta: string): number {
  const hoy = hoyISO();
  if (fechaHasta >= hoy) return 0;

  const ms = Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${fechaHasta}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Edad cumplida a partir de una fecha "YYYY-MM-DD".
 *
 * Es lo que se mira en la práctica —para una salida importa la edad, no el
 * cumpleaños—, y se calcula contra la fecha de hoy en Chile.
 */
export function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;

  const hoy = hoyISO();
  const [anioN, mesN, diaN] = fechaNacimiento.split("-").map(Number);
  const [anioH, mesH, diaH] = hoy.split("-").map(Number);
  if (!anioN || !anioH) return null;

  let edad = anioH - anioN;
  // Todavía no cumple este año si el mes o el día no llegan.
  if (mesH < mesN || (mesH === mesN && diaH < diaN)) edad--;

  return edad >= 0 && edad < 130 ? edad : null;
}

/**
 * Une una lista como se dice en voz alta: "la carpa, el saco y las cintas".
 *
 * Con `join(", ")` queda "la carpa, el saco, las cintas", que se lee como una
 * enumeración de formulario y no como una frase.
 */
export function listarEnEspanol(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

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
 * que una salida a las 20:00 quedaba guardada como las 17:00 de Chile. Quien
 * escribe la hora está pensando en la hora de acá, siempre.
 *
 * Vive en `utils` y no junto a las reuniones —donde se escribió primero—
 * porque el problema no era de las reuniones: es de cualquier formulario con
 * fecha y hora. Las salidas lo arrastraron meses por tenerlo a mano y no verlo.
 *
 * Es el inverso exacto de `paraInputFechaHora`: lo que una escribe, la otra lo
 * lee de vuelta igual.
 */
export function desdeHoraChile(valor: string): Date {
  const tentativo = new Date(`${valor}Z`);
  if (Number.isNaN(tentativo.getTime())) return tentativo;

  return new Date(tentativo.getTime() - desfaseChile(tentativo));
}
