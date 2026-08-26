import { desc, eq } from "drizzle-orm";
import { AlarmClock, Backpack, ClipboardCheck } from "lucide-react";

import { db } from "@/db";
import { equipos, prestamos, usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { diasDeAtraso, formatearFecha, formatearFechaHora } from "@/lib/utils";
import {
  ESTADO_PRESTAMO,
  Insignia,
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
import { Aviso } from "@/components/ui/avisos";
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
  const historial = lista.filter(
    (p) => p.estado === "rechazado" || p.estado === "devuelto",
  );

  // Un préstamo aprobado cuya fecha de devolución ya pasó sigue figurando como
  // equipo en la calle: nadie más lo puede pedir hasta que se registre la
  // devolución. Se separan para que salten a la vista, ordenados por antigüedad.
  const aprobados = lista.filter((p) => p.estado === "aprobado");
  const atrasados = aprobados
    .filter((p) => diasDeAtraso(p.fechaHasta) > 0)
    .sort((a, b) => diasDeAtraso(b.fechaHasta) - diasDeAtraso(a.fechaHasta));
  const alDia = aprobados.filter((p) => diasDeAtraso(p.fechaHasta) === 0);

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
                <span
                  className={
                    diasDeAtraso(p.fechaHasta) > 0 && p.estado === "aprobado"
                      ? "font-medium text-red-700"
                      : undefined
                  }
                >
                  {formatearFecha(p.fechaHasta)}
                </span>
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
                {p.estado === "aprobado" && diasDeAtraso(p.fechaHasta) > 0 ? (
                  <Insignia tono="alerta">
                    <AlarmClock className="size-3" aria-hidden />
                    {diasDeAtraso(p.fechaHasta) === 1
                      ? "1 día de atraso"
                      : `${diasDeAtraso(p.fechaHasta)} días de atraso`}
                  </Insignia>
                ) : (
                  <InsigniaEstado mapa={ESTADO_PRESTAMO} valor={p.estado} />
                )}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          etiqueta="Por revisar"
          valor={pendientes.length}
          detalle={pendientes.length > 0 ? "Esperan tu respuesta" : "Nada pendiente"}
          icono={<ClipboardCheck aria-hidden />}
          tono={pendientes.length > 0 ? "atencion" : "positivo"}
        />
        <Metrica
          etiqueta="Atrasados"
          valor={atrasados.length}
          detalle={
            atrasados.length > 0
              ? `El más antiguo, ${diasDeAtraso(atrasados[0].fechaHasta)} día(s)`
              : "Ninguno vencido"
          }
          icono={<AlarmClock aria-hidden />}
          tono={atrasados.length > 0 ? "alerta" : "positivo"}
        />
        <Metrica
          etiqueta="En préstamo"
          valor={aprobados.length}
          detalle="Fuera del inventario"
          icono={<Backpack aria-hidden />}
        />
        <Metrica etiqueta="Historial" valor={historial.length} detalle="Ya cerrados" />
      </div>

      {atrasados.length > 0 && (
        <Aviso tono="error" titulo="Hay equipo con la devolución vencida">
          {atrasados.length === 1
            ? "Un préstamo pasó su fecha de devolución y el equipo sigue figurando como prestado. "
            : `${atrasados.length} préstamos pasaron su fecha de devolución y esos equipos siguen figurando como prestados. `}
          Si ya te los entregaron, márcalos como devueltos para que vuelvan al
          inventario.
        </Aviso>
      )}

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

      {atrasados.length > 0 && (
        <Tarjeta className="ring-1 ring-red-200">
          <TarjetaCabecera
            titulo="Devolución vencida"
            descripcion="Ordenados del más atrasado al más reciente"
            className="bg-red-50/60"
            accion={
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
                <AlarmClock className="size-4" aria-hidden />
                {atrasados.length}
              </span>
            }
          />
          {filas(atrasados, (p) => (
            <ResolverPrestamo
              prestamoId={p.id}
              decision="devuelto"
              resumen={`Devolución de "${p.equipoNombre}" por ${p.socioNombres} ${p.socioApellidos}, con ${diasDeAtraso(p.fechaHasta)} día(s) de atraso.`}
            />
          ))}
        </Tarjeta>
      )}

      {alDia.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera
            titulo="Equipo en préstamo"
            descripcion="Aprobados y dentro del plazo"
          />
          {filas(alDia, (p) => (
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
