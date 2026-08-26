import type { ZodError } from "zod";

/**
 * Forma única que devuelven todas las server actions de formulario, para que el
 * cliente (`useActionState`) las consuma siempre igual.
 */
export type EstadoFormulario = {
  ok?: boolean;
  mensaje?: string;
  /** Errores por campo, con la misma clave que el `name` del input. */
  errores?: Record<string, string[]>;
  /**
   * Datos que la acción devuelve para mostrar una sola vez, como la contraseña
   * temporal de un socio recién creado (que no se vuelve a poder consultar).
   */
  datos?: Record<string, string>;
  /**
   * Lo que la persona había escrito, para repoblar el formulario cuando la
   * validación falla.
   *
   * React 19 vacía los campos no controlados al terminar una server action. Sin
   * esto, equivocarse en un solo campo obligaría a reescribir el formulario
   * completo. Los componentes lo usan como `defaultValue`.
   */
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoFormulario = {};

/** Campos que nunca se devuelven al cliente. */
const NUNCA_DEVOLVER = /password|contrasena|contraseña|actual|nueva|confirmacion/i;

export function valoresDe(formData?: FormData): Record<string, string> | undefined {
  if (!formData) return undefined;

  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    if (typeof valor === "string" && !NUNCA_DEVOLVER.test(clave)) {
      valores[clave] = valor;
    }
  }
  return valores;
}

export function errorDeValidacion(
  error: ZodError,
  formData?: FormData,
): EstadoFormulario {
  const errores: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const clave = issue.path.join(".") || "_";
    (errores[clave] ??= []).push(issue.message);
  }

  return {
    ok: false,
    mensaje: "Revisa los campos marcados.",
    errores,
    valores: valoresDe(formData),
  };
}

export function fallo(mensaje: string, formData?: FormData): EstadoFormulario {
  return { ok: false, mensaje, valores: valoresDe(formData) };
}

export function falloDeCampo(
  errores: Record<string, string[]>,
  formData?: FormData,
): EstadoFormulario {
  return { ok: false, errores, valores: valoresDe(formData) };
}

export function exito(mensaje: string): EstadoFormulario {
  return { ok: true, mensaje };
}
