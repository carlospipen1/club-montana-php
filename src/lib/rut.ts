/**
 * Utilidades de RUT chileno.
 *
 * El sistema anterior sólo "formateaba" el RUT con expresiones regulares y no
 * validaba el dígito verificador, así que aceptaba RUTs inexistentes. Acá se
 * valida con el módulo 11 real.
 */

/** Deja sólo dígitos y la K final: "12.345.678-9" -> "123456789". */
export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Calcula el dígito verificador de un cuerpo numérico. */
export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

export function validarRut(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) return false;
  return calcularDv(cuerpo) === dv;
}

/** Formatea a "12.345.678-9". Devuelve la entrada tal cual si no es válida. */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return rut;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${conPuntos}-${dv}`;
}
