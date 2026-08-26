CREATE TYPE "public"."dificultad" AS ENUM('facil', 'medio', 'dificil', 'experto');--> statement-breakpoint
CREATE TYPE "public"."estado_cuota" AS ENUM('pendiente', 'pagado', 'parcial');--> statement-breakpoint
CREATE TYPE "public"."estado_equipo" AS ENUM('disponible', 'reservado', 'prestado', 'mantencion');--> statement-breakpoint
CREATE TYPE "public"."estado_prestamo" AS ENUM('pendiente', 'aprobado', 'rechazado', 'devuelto');--> statement-breakpoint
CREATE TYPE "public"."estado_salida" AS ENUM('planificada', 'en_curso', 'finalizada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."estado_usuario" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('admin', 'presidente', 'tesorero', 'encargado_equipo', 'miembro');--> statement-breakpoint
CREATE TYPE "public"."tipo_miembro" AS ENUM('general', 'estudiante');--> statement-breakpoint
CREATE TYPE "public"."tipo_notificacion" AS ENUM('equipo', 'salida', 'cuota', 'sistema');--> statement-breakpoint
CREATE TABLE "cuotas_anuales" (
	"id" serial PRIMARY KEY NOT NULL,
	"anio" integer NOT NULL,
	"monto_general" integer NOT NULL,
	"monto_estudiante" integer NOT NULL,
	"estado" "estado_usuario" DEFAULT 'activo' NOT NULL,
	"creado_por" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cuotas_anuales_anio_unique" UNIQUE("anio")
);
--> statement-breakpoint
CREATE TABLE "cuotas_mensuales" (
	"id" serial PRIMARY KEY NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"tipo_miembro" "tipo_miembro" NOT NULL,
	"monto_esperado" integer NOT NULL,
	"monto_pagado" integer DEFAULT 0 NOT NULL,
	"estado" "estado_cuota" DEFAULT 'pendiente' NOT NULL,
	"fecha_pago" date,
	"observaciones" text,
	"registrado_por" integer,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cuota_unica" UNIQUE("anio","mes","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "equipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria" varchar(60) NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"descripcion" text,
	"estado" "estado_equipo" DEFAULT 'disponible' NOT NULL,
	"fecha_adquisicion" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inscripciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"salida_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"fecha_inscripcion" timestamp with time zone DEFAULT now() NOT NULL,
	"asistio" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	CONSTRAINT "inscripcion_unica" UNIQUE("salida_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"tipo" "tipo_notificacion" NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"mensaje" text NOT NULL,
	"enlace" varchar(255),
	"leida" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prestamos" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipo_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"fecha_solicitud" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_desde" date NOT NULL,
	"fecha_hasta" date NOT NULL,
	"motivo" text NOT NULL,
	"estado" "estado_prestamo" DEFAULT 'pendiente' NOT NULL,
	"aprobado_por" integer,
	"fecha_aprobacion" timestamp with time zone,
	"nota_resolucion" text
);
--> statement-breakpoint
CREATE TABLE "salidas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"fecha_salida" timestamp with time zone NOT NULL,
	"fecha_limite_inscripcion" timestamp with time zone NOT NULL,
	"lugar" varchar(200),
	"nivel_dificultad" "dificultad" DEFAULT 'medio' NOT NULL,
	"cupo_maximo" integer DEFAULT 20 NOT NULL,
	"equipo_requerido" text,
	"encargado_id" integer,
	"estado" "estado_salida" DEFAULT 'planificada' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"rut" varchar(12),
	"email" varchar(160) NOT NULL,
	"password_hash" text NOT NULL,
	"nombres" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"telefono" varchar(30),
	"fecha_ingreso" date,
	"contacto_emergencia_nombre" varchar(120),
	"contacto_emergencia_telefono" varchar(30),
	"contacto_emergencia_relacion" varchar(60),
	"tipo_miembro" "tipo_miembro" DEFAULT 'general' NOT NULL,
	"rol" "rol" DEFAULT 'miembro' NOT NULL,
	"estado" "estado_usuario" DEFAULT 'activo' NOT NULL,
	"debe_cambiar_password" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_rut_unique" UNIQUE("rut"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cuotas_anuales" ADD CONSTRAINT "cuotas_anuales_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas_mensuales" ADD CONSTRAINT "cuotas_mensuales_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas_mensuales" ADD CONSTRAINT "cuotas_mensuales_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_salida_id_salidas_id_fk" FOREIGN KEY ("salida_id") REFERENCES "public"."salidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_encargado_id_usuarios_id_fk" FOREIGN KEY ("encargado_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cuotas_anio_idx" ON "cuotas_mensuales" USING btree ("anio");--> statement-breakpoint
CREATE INDEX "cuotas_usuario_anio_idx" ON "cuotas_mensuales" USING btree ("usuario_id","anio");--> statement-breakpoint
CREATE INDEX "inscripciones_usuario_idx" ON "inscripciones" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "notificaciones_usuario_leida_idx" ON "notificaciones" USING btree ("usuario_id","leida");--> statement-breakpoint
CREATE INDEX "prestamos_estado_idx" ON "prestamos" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "prestamos_usuario_idx" ON "prestamos" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "prestamos_equipo_fechas_idx" ON "prestamos" USING btree ("equipo_id","fecha_desde","fecha_hasta");--> statement-breakpoint
CREATE INDEX "salidas_fecha_idx" ON "salidas" USING btree ("fecha_salida");--> statement-breakpoint
CREATE INDEX "usuarios_estado_idx" ON "usuarios" USING btree ("estado");