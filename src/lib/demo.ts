import "server-only";

import type { EstadoFormulario } from "@/actions/tipos";

/**
 * Modo demostración.
 *
 * El mismo código sirve al club y a un despliegue público de muestra. Lo único
 * que los distingue es esta variable y, sobre todo, que apuntan a bases de datos
 * distintas: el aislamiento real es ese, no esta bandera. La bandera sólo evita
 * las dos cosas que en una vitrina abierta a cualquiera cuestan plata o
 * traen basura.
 */
export const modoDemo = process.env.MODO_DEMO === "1";

/** Contraseña única de todas las cuentas de muestra. Se publica a propósito. */
export const PASSWORD_DEMO = "demo2026";

/**
 * Nombre de la base de la demostración.
 *
 * La siembra lo exige además de `MODO_DEMO`: son dos condiciones independientes,
 * y aunque la variable quedara mal puesta en un despliegue del club, la cadena
 * de conexión seguiría apuntando a otra base y la siembra abortaría.
 */
export const BASE_DEMO = "club_demo";

export const CUENTAS_DEMO = [
  {
    email: "admin@demo.cl",
    etiqueta: "Administrador",
    descripcion: "Ve y gestiona todo: socios, cuotas, equipos, salidas y actas.",
  },
  {
    email: "tesorera@demo.cl",
    etiqueta: "Tesorera",
    descripcion: "Sólo la parte de cuotas: habilitar años y registrar pagos.",
  },
  {
    email: "socio@demo.cl",
    etiqueta: "Socio",
    descripcion: "Lo que ve una persona del club: sus cuotas, sus préstamos, las salidas.",
  },
] as const;

const CORREOS_DEMO: readonly string[] = CUENTAS_DEMO.map((c) => c.email);

export function esCuentaDemo(email: string): boolean {
  return modoDemo && CORREOS_DEMO.includes(email.trim().toLowerCase());
}

/**
 * Respuesta única de las acciones desactivadas en la demostración.
 *
 * Se devuelve desde el servidor y no escondiendo el botón: quien prueba tiene
 * que ver que la acción existe y por qué no corre acá.
 */
export function bloqueadoEnDemo(detalle?: string): EstadoFormulario {
  return {
    ok: false,
    mensaje: detalle
      ? `Sistema de demostración: ${detalle}`
      : "Sistema de demostración: esta acción está desactivada. Todo lo demás sí funciona.",
  };
}
