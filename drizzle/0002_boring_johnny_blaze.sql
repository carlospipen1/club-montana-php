CREATE TYPE "public"."estado_acta" AS ENUM('borrador', 'publicada');--> statement-breakpoint
CREATE TYPE "public"."tipo_acta" AS ENUM('asamblea_ordinaria', 'asamblea_extraordinaria', 'directiva');--> statement-breakpoint
ALTER TYPE "public"."rol" ADD VALUE 'secretario' BEFORE 'miembro';--> statement-breakpoint
ALTER TYPE "public"."tipo_notificacion" ADD VALUE 'acta' BEFORE 'sistema';--> statement-breakpoint
CREATE TABLE "actas" (
	"id" serial PRIMARY KEY NOT NULL,
	"anio" integer NOT NULL,
	"numero" integer NOT NULL,
	"tipo" "tipo_acta" DEFAULT 'asamblea_ordinaria' NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"fecha" date NOT NULL,
	"lugar" varchar(200),
	"cuerpo" text NOT NULL,
	"estado" "estado_acta" DEFAULT 'borrador' NOT NULL,
	"redactada_por" integer,
	"actualizada_por" integer,
	"publicada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acta_numero_unico" UNIQUE("anio","numero")
);
--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_redactada_por_usuarios_id_fk" FOREIGN KEY ("redactada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_actualizada_por_usuarios_id_fk" FOREIGN KEY ("actualizada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actas_anio_idx" ON "actas" USING btree ("anio");--> statement-breakpoint
CREATE INDEX "actas_estado_idx" ON "actas" USING btree ("estado");