CREATE TYPE "public"."estado_album" AS ENUM('borrador', 'publicado');--> statement-breakpoint
CREATE TABLE "albumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(150) NOT NULL,
	"fecha" date NOT NULL,
	"lugar" varchar(200),
	"descripcion" text,
	"estado" "estado_album" DEFAULT 'borrador' NOT NULL,
	"creado_por" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fotos" (
	"id" serial PRIMARY KEY NOT NULL,
	"album_id" integer NOT NULL,
	"url" text NOT NULL,
	"ruta_almacenamiento" text,
	"pie" varchar(300),
	"ancho" integer,
	"alto" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	"es_portada_album" boolean DEFAULT false NOT NULL,
	"en_carrusel" boolean DEFAULT false NOT NULL,
	"es_portada_sitio" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "albumes" ADD CONSTRAINT "albumes_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_album_id_albumes_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "albumes_estado_fecha_idx" ON "albumes" USING btree ("estado","fecha");--> statement-breakpoint
CREATE INDEX "fotos_album_orden_idx" ON "fotos" USING btree ("album_id","orden");--> statement-breakpoint
CREATE INDEX "fotos_carrusel_idx" ON "fotos" USING btree ("en_carrusel");