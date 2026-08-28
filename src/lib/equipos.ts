/**
 * Categorías del inventario técnico.
 *
 * Vive acá y no en `src/actions/equipos.ts` porque ese archivo es `"use server"`
 * y sólo puede exportar funciones asíncronas.
 *
 * La lista es cerrada a propósito. Antes el campo era texto libre con estas
 * mismas categorías como mera sugerencia, y bastaba escribir «Cuerdas»,
 * «cuerdas» y «Cuerda» para terminar con tres categorías distintas que el
 * listado del panel mostraba por separado.
 *
 * Están ordenadas por función y no por actividad: un casco y un arnés sirven
 * tanto en nieve como en roca, así que agrupar por salida obligaba a repetirlos.
 *
 * Para agregar una categoría basta sumarla acá: el formulario y la validación
 * del servidor la toman de esta misma lista.
 */
export const CATEGORIAS_EQUIPO = [
  "Protección personal",
  "Aseguramiento",
  "Cuerdas",
  "Nieve y hielo",
  "Escalada en roca",
  "Campamento y travesía",
  "Comunicación",
] as const;

export type CategoriaEquipo = (typeof CATEGORIAS_EQUIPO)[number];
