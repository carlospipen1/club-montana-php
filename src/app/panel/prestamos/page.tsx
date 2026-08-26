import { desc, eq } from "drizzle-orm";
import { ClipboardCheck } from "lucide-react";

import { db } from "@/db";
import { equipos, prestamos, usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { formatearFecha, formatearFechaHora } from "@/lib/utils";
import {
  ESTADO_PRESTAMO,
  Fila,
  InsigniaEstado,
  Tabla,
  TablaCabecera,
  TablaCuerpo,
  Td,
  Th,
} from "@/components/ui/datos";
import {
  CabeceraPagina,
  Metrica,
  Tarjeta,
  TarjetaCabecera,
  Vacio,
} from "@/components/ui/superficie";
import { ResolverPrestamo } from "./resolver";

export const metadata = { title: "Préstamos" };

export default async function PaginaPrestamos() {
  await requerirCapacidad("gestionarPrestamos");

  const lista = await db
    .select({
      id: prestamos.id,
      estado: prestamos.estado,
      fechaSolicitud: prestamos.fechaSolicitud,
      fechaDesde: prestamos.fechaDesde,
      fechaHasta: prestamos.fechaHasta,
      motivo: prestamos.motivo,
      notaResolucion: prestamos.notaResolucion,
      equipoNombre: equipos.nombre,
      socioNombres: usuarios.nombres,
      socioApellidos: usuarios.apellidos,
      socioEmail: usuarios.email,
    })
    .from(prestamos)
    .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
    .innerJoin(usuarios, eq(prestamos.usuarioId, usuarios.id))
    .orderBy(desc(prestamos.fechaSolicitud));

  const pendientes = lista.filter((p) => p.estado === "pendiente");
  const enCurso = lista.filter((p) => p.estado === "aprobado");
  const historial = lista.filter(
    (p) => p.estado === "rechazado" || p.estado === "devuelto",
  );

  function filas(
    items: typeof lista,
    acciones: (p: (typeof lista)[number]) => React.ReactNode,
  ) {
    return (
      <Tabla>
        <TablaCabecera>
          <tr>
            <Th>Socio</Th>
            <Th>Equipo</Th>
            <Th>Fechas</Th>
            <Th>Motivo</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acciones</Th>
          </tr>
        </TablaCabecera>
        <TablaCuerpo>
          {items.map((p) => (
            <Fila key={p.id}>
              <Td>
                <p className="font-medium text-stone-900">
                  {p.socioNombres} {p.socioApellidos}
                </p>
                <p className="text-xs text-stone-500">
                  Pidió el {formatearFechaHora(p.fechaSolicitud)}
                </p>
              </Td>
              <Td className="whitespace-nowrap">{p.equipoNombre}</Td>
              <Td className="whitespace-nowrap">
                {formatearFecha(p.fechaDesde)}
                <span className="text-stone-400"> → </span>
                {formatearFecha(p.fechaHasta)}
              </Td>
              <Td>
                <p className="line-clamp-2 max-w-xs text-xs">{p.motivo}</p>
                {p.notaResolucion && (
                  <p className="mt-1 line-clamp-2 max-w-xs text-xs text-stone-500 italic">
                    Nota: {p.notaResolucion}
                  </p>
                )}
              </Td>
              <Td>
                <InsigniaEstado mapa={ESTADO_PRESTAMO} valor={p.estado} />
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1.5">
                  {acciones(p)}
                </div>
              </Td>
            </Fila>
          ))}
        </TablaCuerpo>
      </Tabla>
    );
  }

  return (
    <>
      <CabeceraPagina
        titulo="Préstamos de equipo"
        descripcion="Solicitudes de los socios y equipo actualmente en la calle."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metrica
          etiqueta="Por revisar"
          valor={pendientes.length}
          icono={<ClipboardCheck aria-hidden />}
          tono={pendientes.length > 0 ? "atencion" : "positivo"}
        />
        <Metrica etiqueta="En préstamo" valor={enCurso.length} />
        <Metrica etiqueta="Historial" valor={historial.length} />
      </div>

      <Tarjeta>
        <TarjetaCabecera
          titulo="Solicitudes pendientes"
          descripcion="Esperan tu aprobación"
        />
        {pendientes.length === 0 ? (
          <Vacio
            icono={<ClipboardCheck aria-hidden />}
            titulo="Nada pendiente"
            descripcion="No hay solicitudes esperando revisión."
          />
        ) : (
          filas(pendientes, (p) => (
            <>
              <ResolverPrestamo
                prestamoId={p.id}
                decision="aprobado"
                resumen={`${p.socioNombres} ${p.socioApellidos} pide "${p.equipoNombre}".`}
              />
              <ResolverPrestamo
                prestamoId={p.id}
                decision="rechazado"
                resumen={`${p.socioNombres} ${p.socioApellidos} pide "${p.equipoNombre}".`}
              />
            </>
          ))
        )}
      </Tarjeta>

      {enCurso.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera
            titulo="Equipo en préstamo"
            descripcion="Aprobados y aún no devueltos"
          />
          {filas(enCurso, (p) => (
            <ResolverPrestamo
              prestamoId={p.id}
              decision="devuelto"
              resumen={`Devolución de "${p.equipoNombre}" por ${p.socioNombres} ${p.socioApellidos}.`}
            />
          ))}
        </Tarjeta>
      )}

      {historial.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera titulo="Historial" descripcion="Solicitudes ya cerradas" />
          {filas(historial, () => (
            <span className="text-xs text-stone-400">—</span>
          ))}
        </Tarjeta>
      )}
    </>
  );
}
