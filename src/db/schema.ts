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
  "secretario",
  "miembro",
]);

export const tipoActaEnum = pgEnum("tipo_acta", [
  "asamblea_ordinaria",
  "asamblea_extraordinaria",
  "directiva",
]);

export const estadoActaEnum = pgEnum("estado_acta", ["borrador", "publicada"]);

export const estadoReunionEnum = pgEnum("estado_reunion", [
  "convocada",
  "realizada",
  "cancelada",
]);

export const estadoAlbumEnum = pgEnum("estado_album", ["borrador", "publicado"]);

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
  "acta",
  "reunion",
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
    fechaNacimiento: date("fecha_nacimiento"),
    fechaIngreso: date("fecha_ingreso"),

    contactoEmergenciaNombre: varchar("contacto_emergencia_nombre", { length: 120 }),
    contactoEmergenciaTelefono: varchar("contacto_emergencia_telefono", { length: 30 }),
    contactoEmergenciaRelacion: varchar("contacto_emergencia_relacion", { length: 60 }),

    tipoMiembro: tipoMiembroEnum("tipo_miembro").notNull().default("general"),
    rol: rolEnum("rol").notNull().default("miembro"),
    estado: estadoUsuarioEnum("estado").notNull().default("activo"),

    /**
     * Distingue a un socio de una cuenta administrativa.
     *
     * Una cuenta con `esSocio` en falso puede entrar y administrar, pero no es
     * una persona que pertenezca al club: no se le generan cuotas, no aparece
     * en la tesorería y no cuenta en el total de socios. Es el caso de la
     * cuenta de administración, separada de la cuenta personal de quien la usa.
     */
    esSocio: boolean("es_socio").notNull().default(true),

    /** Fuerza el cambio de contraseña en el próximo ingreso. */
    debeCambiarPassword: boolean("debe_cambiar_password").notNull().default(false),

    /**
     * Desde cuándo valen las sesiones de esta persona.
     *
     * La cookie es un JWT de siete días que sólo lleva el id, así que cambiar la
     * contraseña no bastaba para echar a nadie: quien tuviera una sesión abierta
     * seguía dentro hasta que venciera sola. En un "olvidé mi contraseña" eso es
     * justo lo contrario de lo que la persona espera.
     *
     * Adelantar esta fecha invalida de golpe todo lo emitido antes. Se compara
     * en `usuarioActual()` contra la fecha de emisión del token. Lo mueve
     * cualquier cambio de contraseña: el del enlace de recuperación, el del
     * perfil y el que hace la directiva al resetear.
     */
    sesionesDesde: timestamp("sesiones_desde", { withTimezone: true })
      .notNull()
      .defaultNow(),

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
/*  Actas de reunión                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Acta de una reunión del club.
 *
 * El cuerpo es texto libre: los asistentes, los temas y los acuerdos se
 * redactan dentro, como en un libro de actas de papel.
 *
 * El número no se calcula, se guarda. Se propone el siguiente del año al crear
 * una, pero queda editable para poder continuar una numeración que venga de
 * antes del sistema.
 */
/**
 * Una reunión del club: la convocatoria, no el registro de lo que se acordó.
 *
 * Deliberadamente no se modeló como una salida. Una salida arrastra dificultad,
 * equipo requerido y cupo, que para una reunión no significan nada, y además
 * aparecería en la lista pública de próximas salidas siendo un asunto interno.
 *
 * `convocadaEn` distingue las reuniones que se anunciaron por el sistema de las
 * que se crearon después, al redactar el acta de algo que se acordó por
 * teléfono o que viene en papel de años anteriores.
 */
export const reuniones = pgTable(
  "reuniones",
  {
    id: serial("id").primaryKey(),
    tipo: tipoActaEnum("tipo").notNull().default("asamblea_ordinaria"),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    fechaHora: timestamp("fecha_hora", { withTimezone: true }).notNull(),
    lugar: varchar("lugar", { length: 200 }),
    /** El orden del día, tal como se manda en la convocatoria. */
    tabla: text("tabla"),
    estado: estadoReunionEnum("estado").notNull().default("convocada"),

    convocadaPor: integer("convocada_por").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    /** Nulo si la reunión se registró después de ocurrida, sin anunciarse. */
    convocadaEn: timestamp("convocada_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reuniones_fecha_idx").on(t.fechaHora),
    index("reuniones_estado_idx").on(t.estado),
  ],
);

/**
 * Quién asistió. La marca quien redacta el acta, después de la reunión, que es
 * como se hace hoy en el club: no hay confirmación previa de los socios.
 *
 * La ausencia se representa por ausencia de fila. Los matices —"avisó que no
 * podía"— van en el cuerpo del acta, que es texto libre.
 */
export const asistencias = pgTable(
  "asistencias",
  {
    id: serial("id").primaryKey(),
    reunionId: integer("reunion_id")
      .notNull()
      .references(() => reuniones.id, { onDelete: "cascade" }),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    registradoEn: timestamp("registrado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("asistencia_unica").on(t.reunionId, t.usuarioId),
    index("asistencias_reunion_idx").on(t.reunionId),
  ],
);

export const actas = pgTable(
  "actas",
  {
    id: serial("id").primaryKey(),
    /**
     * Toda acta pertenece a una reunión, sin excepciones.
     *
     * Se evaluó permitir actas sueltas para los casos en que no hubo
     * convocatoria previa, y se descartó: la excepción se habría vuelto el
     * camino corto, y en un año la mitad de las actas estarían mal clasificadas
     * sólo para saltarse un paso. En vez de eso, el formulario del acta crea la
     * reunión sobre la marcha cuando no existe, con la fecha y el lugar que de
     * todos modos hay que escribir.
     */
    reunionId: integer("reunion_id")
      .notNull()
      .references(() => reuniones.id, { onDelete: "restrict" }),
    anio: integer("anio").notNull(),
    numero: integer("numero").notNull(),
    tipo: tipoActaEnum("tipo").notNull().default("asamblea_ordinaria"),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    fecha: date("fecha").notNull(),
    lugar: varchar("lugar", { length: 200 }),
    cuerpo: text("cuerpo").notNull(),
    estado: estadoActaEnum("estado").notNull().default("borrador"),

    redactadaPor: integer("redactada_por").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    /** Queda constancia de quién tocó el acta por última vez y cuándo. */
    actualizadaPor: integer("actualizada_por").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    publicadaEn: timestamp("publicada_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // No pueden existir dos "Acta N°3 · 2026".
    unique("acta_numero_unico").on(t.anio, t.numero),
    index("actas_anio_idx").on(t.anio),
    index("actas_estado_idx").on(t.estado),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Galería                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Un álbum de fotos, normalmente el de una salida.
 *
 * A propósito no está atado a la tabla `salidas`: también se arman álbumes de
 * talleres, asambleas o aniversarios, y no se quiere obligar a inventar una
 * salida para poder publicar fotos.
 */
export const albumes = pgTable(
  "albumes",
  {
    id: serial("id").primaryKey(),
    titulo: varchar("titulo", { length: 150 }).notNull(),
    fecha: date("fecha").notNull(),
    lugar: varchar("lugar", { length: 200 }),
    descripcion: text("descripcion"),
    estado: estadoAlbumEnum("estado").notNull().default("borrador"),
    creadoPor: integer("creado_por").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("albumes_estado_fecha_idx").on(t.estado, t.fecha)],
);

/**
 * Una foto pertenece siempre a un álbum. Dónde aparece en el sitio lo deciden
 * tres marcas, en vez de duplicar el archivo en colecciones separadas:
 *
 *   - `esPortadaSitio`  una sola en todo el sistema: el fondo del hero.
 *   - `enCarrusel`      hasta el tope definido en el mantenedor.
 *   - `esPortadaAlbum`  una por álbum, la que representa al álbum en la grilla.
 *
 * `rutaAlmacenamiento` guarda la ruta interna del proveedor —no la URL pública—
 * porque es lo que se necesita para borrar el archivo cuando se borra la foto.
 */
export const fotos = pgTable(
  "fotos",
  {
    id: serial("id").primaryKey(),
    albumId: integer("album_id")
      .notNull()
      .references(() => albumes.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    rutaAlmacenamiento: text("ruta_almacenamiento"),
    /** Texto alternativo y pie de foto. Opcional, pero el mantenedor lo reclama. */
    pie: varchar("pie", { length: 300 }),
    ancho: integer("ancho"),
    alto: integer("alto"),
    orden: integer("orden").notNull().default(0),

    esPortadaAlbum: boolean("es_portada_album").notNull().default(false),
    enCarrusel: boolean("en_carrusel").notNull().default(false),
    esPortadaSitio: boolean("es_portada_sitio").notNull().default(false),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("fotos_album_orden_idx").on(t.albumId, t.orden),
    index("fotos_carrusel_idx").on(t.enCarrusel),
  ],
);

export const albumesRelations = relations(albumes, ({ many }) => ({
  fotos: many(fotos),
}));

export const fotosRelations = relations(fotos, ({ one }) => ({
  album: one(albumes, { fields: [fotos.albumId], references: [albumes.id] }),
}));

export type Album = typeof albumes.$inferSelect;
export type Foto = typeof fotos.$inferSelect;

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
/*  Recuperación de contraseña                                                 */
/* -------------------------------------------------------------------------- */

export const tokensRecuperacion = pgTable(
  "tokens_recuperacion",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),

    /**
     * Se guarda el SHA-256 del token, nunca el token mismo. Quien consiga leer
     * esta tabla —un volcado filtrado, una consola abierta— no puede usar nada
     * de lo que ve: el valor que viaja en el enlace no está aquí.
     *
     * SHA-256 y no bcrypt a propósito: el token son 32 bytes aleatorios, no una
     * contraseña que alguien pueda adivinar, así que el costo artificial de
     * bcrypt no compra nada y sí encarece cada validación.
     */
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),

    expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
    /** Nulo mientras el token sirve. Se sella al usarlo o al anularlo. */
    usadoEn: timestamp("usado_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  // Para contar las solicitudes recientes de un socio (el límite por hora) sin
  // recorrer la tabla entera.
  (t) => [index("tokens_recuperacion_usuario_idx").on(t.usuarioId, t.creadoEn)],
);

/* -------------------------------------------------------------------------- */
/*  Relaciones                                                                 */
/* -------------------------------------------------------------------------- */

export const usuariosRelations = relations(usuarios, ({ many }) => ({
  prestamos: many(prestamos),
  inscripciones: many(inscripciones),
  cuotas: many(cuotasMensuales),
  notificaciones: many(notificaciones),
  tokensRecuperacion: many(tokensRecuperacion),
}));

export const tokensRecuperacionRelations = relations(tokensRecuperacion, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [tokensRecuperacion.usuarioId],
    references: [usuarios.id],
  }),
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
export type TokenRecuperacion = typeof tokensRecuperacion.$inferSelect;

export type Rol = (typeof rolEnum.enumValues)[number];
export type TipoMiembro = (typeof tipoMiembroEnum.enumValues)[number];

export const actasRelations = relations(actas, ({ one }) => ({
  redactor: one(usuarios, {
    fields: [actas.redactadaPor],
    references: [usuarios.id],
  }),
  reunion: one(reuniones, {
    fields: [actas.reunionId],
    references: [reuniones.id],
  }),
}));

export const reunionesRelations = relations(reuniones, ({ one, many }) => ({
  convocante: one(usuarios, {
    fields: [reuniones.convocadaPor],
    references: [usuarios.id],
  }),
  asistencias: many(asistencias),
}));

export const asistenciasRelations = relations(asistencias, ({ one }) => ({
  reunion: one(reuniones, {
    fields: [asistencias.reunionId],
    references: [reuniones.id],
  }),
  socio: one(usuarios, {
    fields: [asistencias.usuarioId],
    references: [usuarios.id],
  }),
}));

export type Acta = typeof actas.$inferSelect;
export type TipoActa = (typeof tipoActaEnum.enumValues)[number];
export type Reunion = typeof reuniones.$inferSelect;
export type EstadoReunion = (typeof estadoReunionEnum.enumValues)[number];
