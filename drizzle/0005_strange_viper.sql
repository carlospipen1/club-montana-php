DO $$ BEGIN
	CREATE TYPE "public"."estado_reunion" AS ENUM('convocada', 'realizada', 'cancelada');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TYPE "public"."tipo_notificacion" ADD VALUE IF NOT EXISTS 'reunion' BEFORE 'sistema';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asistencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"reunion_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"registrado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asistencia_unica" UNIQUE("reunion_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reuniones" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "tipo_acta" DEFAULT 'asamblea_ordinaria' NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"fecha_hora" timestamp with time zone NOT NULL,
	"lugar" varchar(200),
	"tabla" text,
	"estado" "estado_reunion" DEFAULT 'convocada' NOT NULL,
	"convocada_por" integer,
	"convocada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asistencias" DROP CONSTRAINT IF EXISTS "asistencias_reunion_id_reuniones_id_fk";--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_reunion_id_reuniones_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reuniones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencias" DROP CONSTRAINT IF EXISTS "asistencias_usuario_id_usuarios_id_fk";--> statement-breakpoint
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reuniones" DROP CONSTRAINT IF EXISTS "reuniones_convocada_por_usuarios_id_fk";--> statement-breakpoint
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_convocada_por_usuarios_id_fk" FOREIGN KEY ("convocada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asistencias_reunion_idx" ON "asistencias" USING btree ("reunion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reuniones_fecha_idx" ON "reuniones" USING btree ("fecha_hora");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reuniones_estado_idx" ON "reuniones" USING btree ("estado");--> statement-breakpoint
ALTER TABLE "actas" ADD COLUMN IF NOT EXISTS "reunion_id" integer;--> statement-breakpoint
DO $$
DECLARE
	fila RECORD;
	nueva_id integer;
BEGIN
	-- Toda acta que ya existía queda con su reunión, creada a partir de sus
	-- propios datos y marcada como realizada. `convocada_en` se deja nulo: son
	-- reuniones que nunca se anunciaron por el sistema, porque el sistema no
	-- tenía cómo hacerlo cuando ocurrieron.
	FOR fila IN SELECT id, tipo, titulo, fecha, lugar, redactada_por FROM actas WHERE reunion_id IS NULL LOOP
		INSERT INTO reuniones (tipo, titulo, fecha_hora, lugar, estado, convocada_por)
		VALUES (
			fila.tipo,
			fila.titulo,
			(fila.fecha + time '12:00') AT TIME ZONE 'America/Santiago',
			fila.lugar,
			'realizada',
			fila.redactada_por
		)
		RETURNING id INTO nueva_id;

		UPDATE actas SET reunion_id = nueva_id WHERE id = fila.id;
	END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "actas" ALTER COLUMN "reunion_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "actas" DROP CONSTRAINT IF EXISTS "actas_reunion_id_reuniones_id_fk";--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_reunion_id_reuniones_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reuniones"("id") ON DELETE restrict ON UPDATE no action;
