/**
 * Constantes de la galería.
 *
 * Viven aquí y no junto a las acciones porque un archivo `"use server"` sólo
 * puede exportar funciones async: cualquier otra cosa rompe el módulo completo.
 * Este, en cambio, se puede importar desde donde sea.
 */

/**
 * Tope de fotos del carrusel de la portada.
 *
 * No es una limitación técnica: es que más de una docena de puntitos deja de
 * ser un indicador y pasa a ser una mancha —en un teléfono de 375 px ni
 * siquiera caben—, y que la mayoría mira tres o cuatro fotos antes de seguir
 * bajando. El volumen va en los álbumes; el carrusel es el resumen.
 */
export const MAXIMO_CARRUSEL = 12;
