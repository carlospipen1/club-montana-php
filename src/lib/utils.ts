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
