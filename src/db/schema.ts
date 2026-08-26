import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const rolEnum = pgEnum("rol", [
  "admin",
  "presidente",
  "tesorero",
  "encargado_equipo",
  "comision_tecnica",
  "miembro",
]);

export const tipoMiembroEnum = pgEnum("tipo_miembro", ["general", "estudiante"]);
export const estadoUsuarioEnum = pgEnum("estado_usuario", ["activo", "inactivo"]);

export const estadoEquipoEnum = pgEnum("estado_equipo", [
  "disponible",
  "reservado",
  "prestado",
  "mantencion",
]);

export const estadoPrestamoEnum = pgEnum("estado_prestamo", [
  "pendiente",
  "aprobado",
  "rechazado",
  "devuelto",
]);

export const dificultadEnum = pgEnum("dificultad", [
  "facil",
  "medio",
  "dificil",
  "experto",
]);

export const estadoSalidaEnum = pgEnum("estado_salida", [
  "planificada",
  "en_curso",
  "finalizada",
  "cancelada",
]);

export const estadoCuotaEnum = pgEnum("estado_cuota", [
  "pendiente",
  "pagado",
  "parcial",
]);

export const tipoNotificacionEnum = pgEnum("tipo_notificacion", [
  "equipo",
  "salida",
  "cuota",
  "sistema",
]);

/* -------------------------------------------------------------------------- */
/*  Usuarios                                                                   */
/* -------------------------------------------------------------------------- */

export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    rut: varchar("rut", { length: 12 }).unique(),
    email: varchar("email", { length: 160 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    nombres: varchar("nombres", { length: 100 }).notNull(),
    apellidos: varchar("apellidos", { length: 100 }).notNull(),
    telefono: varchar("telefono", { length: 30 }),
    fechaIngreso: date("fecha_ingreso"),

    contactoEmergenciaNombre: varchar("contacto_emergencia_nombre", { length: 120 }),
    contactoEmergenciaTelefono: varchar("contacto_emergencia_telefono", { length: 30 }),
    contactoEmergenciaRelacion: varchar("contacto_emergencia_relacion", { length: 60 }),

    tipoMiembro: tipoMiembroEnum("tipo_miembro").notNull().default("general"),
    rol: rolEnum("rol").notNull().default("miembro"),
    estado: estadoUsuarioEnum("estado").notNull().default("activo"),

    /** Fuerza el cambio de contraseña en el próximo ingreso. */
    debeCambiarPassword: boolean("debe_cambiar_password").notNull().default(false),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  // Casi todas las consultas filtran por socios activos.
  (t) => [index("usuarios_estado_idx").on(t.estado)],
);

/* -------------------------------------------------------------------------- */
/*  Equipos y préstamos                                                        */
/* -------------------------------------------------------------------------- */

export const equipos = pgTable("equipos", {
  id: serial("id").primaryKey(),
  categoria: varchar("categoria", { length: 60 }).notNull(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  descripcion: text("descripcion"),
  estado: estadoEquipoEnum("estado").notNull().default("disponible"),
  fechaAdquisicion: date("fecha_adquisicion"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const prestamos = pgTable(
  "prestamos",
  {
    id: serial("id").primaryKey(),
    equipoId: integer("equipo_id")
      .notNull()
      .references(() => equipos.id, { onDelete: "cascade" }),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    fechaSolicitud: timestamp("fecha_solicitud", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaDesde: date("fecha_desde").notNull(),
    fechaHasta: date("fecha_hasta").notNull(),
    motivo: text("motivo").notNull(),
    estado: estadoPrestamoEnum("estado").notNull().default("pendiente"),
    aprobadoPor: integer("aprobado_por").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    fechaAprobacion: timestamp("fecha_aprobacion", { withTimezone: true }),
    notaResolucion: text("nota_resolucion"),
  },
  (t) => [
    index("prestamos_estado_idx").on(t.estado),
    index("prestamos_usuario_idx").on(t.usuarioId),
    // Para detectar choques de fechas sobre un mismo equipo al solicitar.
    index("prestamos_equipo_fechas_idx").on(t.equipoId, t.fechaDesde, t.fechaHasta),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Salidas                                                                    */
/* -------------------------------------------------------------------------- */

export const salidas = pgTable(
  "salidas",
  {
    id: serial("id").primaryKey(),
    nombre: varchar("nombre", { length: 150 }).notNull(),
    descripcion: text("descripcion"),
    fechaSalida: timestamp("fecha_salida", { withTimezone: true }).notNull(),
    fechaLimiteInscripcion: timestamp("fecha_limite_inscripcion", {
      withTimezone: true,
    }).notNull(),
    lugar: varchar("lugar", { length: 200 }),
    nivelDificultad: dificultadEnum("nivel_dificultad").notNull().default("medio"),
    cupoMaximo: integer("cupo_maximo").notNull().default(20),
    equipoRequerido: text("equipo_requerido"),
    encargadoId: integer("encargado_id").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    estado: estadoSalidaEnum("estado").notNull().default("planificada"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("salidas_fecha_idx").on(t.fechaSalida)],
);

export const inscripciones = pgTable(
  "inscripciones",
  {
    id: serial("id").primaryKey(),
    salidaId: integer("salida_id")
      .notNull()
      .references(() => salidas.id, { onDelete: "cascade" }),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    fechaInscripcion: timestamp("fecha_inscripcion", { withTimezone: true })
      .notNull()
      .defaultNow(),
    asistio: boolean("asistio").notNull().default(false),
    observaciones: text("observaciones"),
  },
  (t) => [
    unique("inscripcion_unica").on(t.salidaId, t.usuarioId),
    index("inscripciones_usuario_idx").on(t.usuarioId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Cuotas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Un período anual habilitado por la tesorería. Los montos viven aquí (y no
 * hardcodeados en el código como en el sistema anterior) para que subir la
 * cuota un año no reescriba el historial de los años anteriores.
 * Montos en pesos chilenos enteros: el CLP no usa decimales.
 */
export const cuotasAnuales = pgTable("cuotas_anuales", {
  id: serial("id").primaryKey(),
  anio: integer("anio").notNull().unique(),
  montoGeneral: integer("monto_general").notNull(),
  montoEstudiante: integer("monto_estudiante").notNull(),
  estado: estadoUsuarioEnum("estado").notNull().default("activo"),
  creadoPor: integer("creado_por").references(() => usuarios.id, {
    onDelete: "set null",
  }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const cuotasMensuales = pgTable(
  "cuotas_mensuales",
  {
    id: serial("id").primaryKey(),
    anio: integer("anio").notNull(),
    mes: integer("mes").notNull(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    tipoMiembro: tipoMiembroEnum("tipo_miembro").notNull(),
    montoEsperado: integer("monto_esperado").notNull(),
    montoPagado: integer("monto_pagado").notNull().default(0),
    estado: estadoCuotaEnum("estado").notNull().default("pendiente"),
    fechaPago: date("fecha_pago"),
    observaciones: text("observaciones"),
    registradoPor: integer("registrado_por").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("cuota_unica").on(t.anio, t.mes, t.usuarioId),
    index("cuotas_anio_idx").on(t.anio),
    index("cuotas_usuario_anio_idx").on(t.usuarioId, t.anio),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Notificaciones                                                             */
/* -------------------------------------------------------------------------- */

export const notificaciones = pgTable(
  "notificaciones",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    tipo: tipoNotificacionEnum("tipo").notNull(),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    mensaje: text("mensaje").notNull(),
    enlace: varchar("enlace", { length: 255 }),
    leida: boolean("leida").notNull().default(false),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  // El layout del panel cuenta las no leídas en CADA carga de página: sin este
  // índice sería un recorrido completo de la tabla en cada request.
  (t) => [index("notificaciones_usuario_leida_idx").on(t.usuarioId, t.leida)],
);

/* -------------------------------------------------------------------------- */
/*  Relaciones                                                                 */
/* -------------------------------------------------------------------------- */

export const usuariosRelations = relations(usuarios, ({ many }) => ({
  prestamos: many(prestamos),
  inscripciones: many(inscripciones),
  cuotas: many(cuotasMensuales),
  notificaciones: many(notificaciones),
}));

export const equiposRelations = relations(equipos, ({ many }) => ({
  prestamos: many(prestamos),
}));

export const prestamosRelations = relations(prestamos, ({ one }) => ({
  equipo: one(equipos, { fields: [prestamos.equipoId], references: [equipos.id] }),
  usuario: one(usuarios, {
    fields: [prestamos.usuarioId],
    references: [usuarios.id],
  }),
}));

export const salidasRelations = relations(salidas, ({ one, many }) => ({
  encargado: one(usuarios, {
    fields: [salidas.encargadoId],
    references: [usuarios.id],
  }),
  inscripciones: many(inscripciones),
}));

export const inscripcionesRelations = relations(inscripciones, ({ one }) => ({
  salida: one(salidas, {
    fields: [inscripciones.salidaId],
    references: [salidas.id],
  }),
  usuario: one(usuarios, {
    fields: [inscripciones.usuarioId],
    references: [usuarios.id],
  }),
}));

export const cuotasMensualesRelations = relations(cuotasMensuales, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [cuotasMensuales.usuarioId],
    references: [usuarios.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*  Tipos inferidos                                                            */
/* -------------------------------------------------------------------------- */

export type Usuario = typeof usuarios.$inferSelect;
export type NuevoUsuario = typeof usuarios.$inferInsert;
export type Equipo = typeof equipos.$inferSelect;
export type Prestamo = typeof prestamos.$inferSelect;
export type Salida = typeof salidas.$inferSelect;
export type Inscripcion = typeof inscripciones.$inferSelect;
export type CuotaAnual = typeof cuotasAnuales.$inferSelect;
export type CuotaMensual = typeof cuotasMensuales.$inferSelect;
export type Notificacion = typeof notificaciones.$inferSelect;

export type Rol = (typeof rolEnum.enumValues)[number];
export type TipoMiembro = (typeof tipoMiembroEnum.enumValues)[number];
