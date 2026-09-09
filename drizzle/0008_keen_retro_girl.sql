CREATE TABLE "solicitudes_prestamo" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"fecha_solicitud" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_desde" date NOT NULL,
	"fecha_hasta" date NOT NULL,
	"motivo" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prestamos" ADD COLUMN "solicitud_id" integer;--> statement-breakpoint
ALTER TABLE "prestamos" ADD COLUMN "resuelto_por" integer;--> statement-breakpoint
ALTER TABLE "prestamos" ADD COLUMN "fecha_resolucion" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prestamos" ADD COLUMN "devuelto_por" integer;--> statement-breakpoint
ALTER TABLE "prestamos" ADD COLUMN "fecha_devolucion" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitudes_prestamo" ADD CONSTRAINT "solicitudes_prestamo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solicitudes_prestamo_usuario_idx" ON "solicitudes_prestamo" USING btree ("usuario_id","fecha_solicitud");--> statement-breakpoint
CREATE INDEX "solicitudes_prestamo_fecha_idx" ON "solicitudes_prestamo" USING btree ("fecha_solicitud");--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_solicitud_id_solicitudes_prestamo_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes_prestamo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_resuelto_por_usuarios_id_fk" FOREIGN KEY ("resuelto_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_devuelto_por_usuarios_id_fk" FOREIGN KEY ("devuelto_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prestamos_equipo_idx" ON "prestamos" USING btree ("equipo_id");--> statement-breakpoint
CREATE INDEX "prestamos_solicitud_idx" ON "prestamos" USING btree ("solicitud_id");--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_solicitud_equipo_unico" UNIQUE("solicitud_id","equipo_id");--> statement-breakpoint
-- Relleno de los datos que ya existen. Esto no lo escribe `drizzle-kit`: sin
-- esto, la migración siguiente falla al poner `solicitud_id` como obligatorio.
--
-- Cada préstamo suelto pasa a ser una solicitud de un solo equipo. La columna
-- `prestamo_origen` es andamiaje: existe sólo para saber qué solicitud le
-- corresponde a cada préstamo, y se bota al final.
ALTER TABLE "solicitudes_prestamo" ADD COLUMN "prestamo_origen" integer;--> statement-breakpoint
INSERT INTO "solicitudes_prestamo"
  ("usuario_id", "fecha_solicitud", "fecha_desde", "fecha_hasta", "motivo", "prestamo_origen")
SELECT prestamos.usuario_id, prestamos.fecha_solicitud, prestamos.fecha_desde,
       prestamos.fecha_hasta, prestamos.motivo, prestamos.id
FROM prestamos;--> statement-breakpoint
UPDATE prestamos
SET solicitud_id = solicitudes_prestamo.id
FROM solicitudes_prestamo
WHERE solicitudes_prestamo.prestamo_origen = prestamos.id;--> statement-breakpoint
-- `aprobado_por` y `fecha_aprobacion` eran una sola pareja de columnas para la
-- aprobación y la devolución: registrar la devolución pisaba la aprobación. En
-- un préstamo ya devuelto, entonces, lo que quedó guardado es la devolución, y
-- quién lo aprobó se perdió antes de esta migración. Se reparte según eso.
UPDATE prestamos
SET devuelto_por = prestamos.aprobado_por, fecha_devolucion = prestamos.fecha_aprobacion
WHERE prestamos.estado = 'devuelto';--> statement-breakpoint
UPDATE prestamos
SET resuelto_por = prestamos.aprobado_por, fecha_resolucion = prestamos.fecha_aprobacion
WHERE prestamos.estado <> 'devuelto' AND prestamos.aprobado_por IS NOT NULL;--> statement-breakpoint
ALTER TABLE "solicitudes_prestamo" DROP COLUMN "prestamo_origen";
