ALTER TABLE "prestamos" DROP CONSTRAINT "prestamos_usuario_id_usuarios_id_fk";
--> statement-breakpoint
ALTER TABLE "prestamos" DROP CONSTRAINT "prestamos_aprobado_por_usuarios_id_fk";
--> statement-breakpoint
DROP INDEX "prestamos_usuario_idx";--> statement-breakpoint
DROP INDEX "prestamos_equipo_fechas_idx";--> statement-breakpoint
ALTER TABLE "prestamos" ALTER COLUMN "solicitud_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prestamos" DROP COLUMN "usuario_id";--> statement-breakpoint
ALTER TABLE "prestamos" DROP COLUMN "fecha_solicitud";--> statement-breakpoint
ALTER TABLE "prestamos" DROP COLUMN "fecha_desde";--> statement-breakpoint
ALTER TABLE "prestamos" DROP COLUMN "fecha_hasta";--> statement-breakpoint
ALTER TABLE "prestamos" DROP COLUMN "motivo";--> statement-breakpoint
ALTER TABLE "prestamos" DROP COLUMN "aprobado_por";--> statement-breakpoint
ALTER TABLE "prestamos" DROP COLUMN "fecha_aprobacion";