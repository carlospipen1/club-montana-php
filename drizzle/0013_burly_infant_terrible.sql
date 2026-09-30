CREATE TYPE "public"."grupo_sanguineo" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'no_sabe');--> statement-breakpoint
CREATE TYPE "public"."prevision" AS ENUM('fonasa', 'isapre', 'otra');--> statement-breakpoint
CREATE TABLE "certificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"nombre" varchar(140) NOT NULL,
	"institucion" varchar(140),
	"fecha_obtencion" date,
	"fecha_vencimiento" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fichas_socio" (
	"usuario_id" integer PRIMARY KEY NOT NULL,
	"grupo_sanguineo" "grupo_sanguineo",
	"alergias" text,
	"condiciones" text,
	"medicamentos" text,
	"prevision" "prevision",
	"prevision_detalle" varchar(80),
	"seguro_compania" varchar(120),
	"seguro_poliza" varchar(60),
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "contacto_emergencia2_nombre" varchar(120);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "contacto_emergencia2_telefono" varchar(30);--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "contacto_emergencia2_relacion" varchar(60);--> statement-breakpoint
ALTER TABLE "certificaciones" ADD CONSTRAINT "certificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichas_socio" ADD CONSTRAINT "fichas_socio_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certificaciones_usuario_idx" ON "certificaciones" USING btree ("usuario_id");