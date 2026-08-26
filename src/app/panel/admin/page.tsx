import { count, eq, sql } from "drizzle-orm";
import { Backpack, Database, Download, Mountain, Users, Wallet } from "lucide-react";

import { db } from "@/db";
import {
  cuotasMensuales,
  equipos,
  notificaciones,
  prestamos,
  salidas,
  usuarios,
} from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { formatearCLP } from "@/lib/utils";
import { Aviso } from "@/components/ui/avisos";
import { BotonEnlace } from "@/components/ui/boton";
import {
  CabeceraPagina,
  Metrica,
  Tarjeta,
  TarjetaCabecera,
} from "@/components/ui/superficie";

export const metadata = { title: "Administración" };

const EXPORTABLES = [
  { id: "socios", titulo: "Socios", detalle: "Datos de contacto y de emergencia." },
  { id: "cuotas", titulo: "Cuotas", detalle: "Todas las mensualidades y sus pagos." },
  { id: "salidas", titulo: "Salidas", detalle: "Con el número de inscritos." },
  { id: "prestamos", titulo: "Préstamos", detalle: "Historial completo de equipo." },
  { id: "equipos", titulo: "Equipos", detalle: "Inventario del club." },
];

export default async function PaginaAdmin() {
  await requerirCapacidad("administrarSistema");

  const [
    [{ totalSocios }],
    [{ sociosActivos }],
    [{ totalEquipos }],
    [{ totalSalidas }],
    [{ prestamosVivos }],
    [{ totalNotificaciones }],
    [recaudacion],
  ] = await Promise.all([
    db.select({ totalSocios: count() }).from(usuarios),
    db
      .select({ sociosActivos: count() })
      .from(usuarios)
      .where(eq(usuarios.estado, "activo")),
    db.select({ totalEquipos: count() }).from(equipos),
    db.select({ totalSalidas: count() }).from(salidas),
    db
      .select({ prestamosVivos: count() })
      .from(prestamos)
      .where(eq(prestamos.estado, "aprobado")),
    db.select({ totalNotificaciones: count() }).from(notificaciones),
    db
      .select({
        pagado: sql<number>`coalesce(sum(${cuotasMensuales.montoPagado}), 0)::int`,
        esperado: sql<number>`coalesce(sum(${cuotasMensuales.montoEsperado}), 0)::int`,
      })
      .from(cuotasMensuales),
  ]);

  return (
    <>
      <CabeceraPagina
        titulo="Administración"
        descripcion="Estado general del sistema y exportación de datos."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          etiqueta="Socios"
          valor={totalSocios}
          detalle={`${sociosActivos} activos`}
          icono={<Users aria-hidden />}
        />
        <Metrica
          etiqueta="Equipos"
          valor={totalEquipos}
          detalle={`${prestamosVivos} en préstamo`}
          icono={<Backpack aria-hidden />}
        />
        <Metrica
          etiqueta="Salidas"
          valor={totalSalidas}
          detalle="Registradas históricamente"
          icono={<Mountain aria-hidden />}
        />
        <Metrica
          etiqueta="Recaudación total"
          valor={formatearCLP(recaudacion?.pagado ?? 0)}
          detalle={`de ${formatearCLP(recaudacion?.esperado ?? 0)} generados`}
          icono={<Wallet aria-hidden />}
          tono="positivo"
        />
      </div>

      <Tarjeta>
        <TarjetaCabecera
          titulo="Exportar datos"
          descripcion="Archivos CSV listos para abrir en Excel o Google Sheets."
        />
        <ul className="divide-y divide-stone-100">
          {EXPORTABLES.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-stone-900">{e.titulo}</p>
                <p className="text-xs text-stone-500">{e.detalle}</p>
              </div>
              <BotonEnlace
                href={`/panel/admin/exportar/${e.id}`}
                variante="outline"
                tamano="sm"
                prefetch={false}
              >
                <Download aria-hidden />
                Descargar CSV
              </BotonEnlace>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera
          titulo="Respaldos de la base de datos"
          accion={<Database className="size-4 text-stone-400" aria-hidden />}
        />
        <div className="space-y-3 px-5 py-4">
          <Aviso tono="info" titulo="Los respaldos son automáticos">
            La base vive en Neon, que mantiene un historial continuo y permite restaurar
            el estado exacto de cualquier momento dentro de la ventana de retención de
            tu plan. No hay que generar copias a mano.
          </Aviso>
          <p className="text-sm text-stone-600">
            Para restaurar, entra a{" "}
            <span className="font-medium">console.neon.tech</span> → tu proyecto →{" "}
            <span className="font-medium">Branches</span> →{" "}
            <span className="font-medium">Restore</span>, y elige la fecha y hora.
          </p>
          <p className="text-xs text-stone-500">
            El CSV de arriba sirve para trabajar en planilla o guardar una copia fuera
            de línea, pero no reemplaza al respaldo de la base: {totalNotificaciones}{" "}
            notificaciones y las relaciones entre tablas no se reconstruyen desde esos
            archivos.
          </p>
        </div>
      </Tarjeta>
    </>
  );
}
