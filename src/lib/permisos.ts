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
  /** El registro de socios trae datos personales y de emergencia. */
  verSocios: ["admin"],
  gestionarSocios: ["admin"],
  gestionarCuotas: ["admin", "tesorero"],
  /** Alta, edición y baja del inventario. Pedir prestado no requiere permiso. */
  gestionarEquipos: ["admin", "encargado_equipo"],
  gestionarPrestamos: ["admin", "encargado_equipo"],
  /** Publicar y editar salidas. Inscribirse no requiere permiso. */
  gestionarSalidas: ["admin", "comision_tecnica"],
  /** Redactar y publicar actas. Leerlas no requiere permiso. */
  gestionarActas: ["admin", "secretario"],
  /** Álbumes, fotos y qué aparece en la portada. */
  gestionarGaleria: ["admin"],
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
  comision_tecnica: "Comisión técnica",
  secretario: "Secretario/a",
  miembro: "Socio",
};

/** Qué hace cada rol, para orientar a quien crea un socio. */
export const DESCRIPCIONES_ROL: Record<Rol, string> = {
  admin: "Acceso completo, incluida la administración del sistema.",
  presidente: "Sin atribuciones de gestión: los mismos accesos que un socio.",
  tesorero: "Gestiona las cuotas: habilita años y registra pagos.",
  encargado_equipo: "Administra el inventario y resuelve las solicitudes de préstamo.",
  comision_tecnica: "Publica y edita las salidas del club.",
  secretario: "Redacta y publica las actas de las reuniones.",
  miembro: "Ve salidas y actas, se inscribe, solicita equipo y consulta sus cuotas.",
};
