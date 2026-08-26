import type { Rol } from "@/db/schema";

/**
 * Permisos por capacidad, no por rol.
 *
 * En el sistema anterior cada página repetía condiciones sueltas del tipo
 * `$_SESSION['rol'] === 'admin' || ...`, y bastaba olvidar una para abrir un
 * agujero. Acá cada capacidad se declara una sola vez y las pantallas preguntan
 * por la capacidad, nunca por el rol.
 */
export const CAPACIDADES = {
  verSocios: ["admin", "presidente", "tesorero"],
  gestionarSocios: ["admin", "presidente"],
  gestionarCuotas: ["admin", "presidente", "tesorero"],
  gestionarEquipos: ["admin", "presidente", "encargado_equipo"],
  gestionarPrestamos: ["admin", "presidente", "encargado_equipo"],
  gestionarSalidas: ["admin", "presidente"],
  administrarSistema: ["admin"],
} as const satisfies Record<string, readonly Rol[]>;

export type Capacidad = keyof typeof CAPACIDADES;

export function puede(rol: Rol, capacidad: Capacidad): boolean {
  return (CAPACIDADES[capacidad] as readonly Rol[]).includes(rol);
}

export const ETIQUETAS_ROL: Record<Rol, string> = {
  admin: "Administrador",
  presidente: "Presidente",
  tesorero: "Tesorero",
  encargado_equipo: "Encargado de equipos",
  miembro: "Socio",
};
