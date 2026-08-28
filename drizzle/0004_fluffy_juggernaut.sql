ALTER TABLE "usuarios" ADD COLUMN "fecha_nacimiento" date;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "es_socio" boolean DEFAULT true NOT NULL;