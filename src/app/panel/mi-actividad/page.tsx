import { desc, eq } from "drizzle-orm";
import { Activity, AlarmClock, Backpack, Mountain, Wallet } from "lucide-react";

import { db } from "@/db";
import {
  cuotasMensuales,
  equipos,
  inscripciones,
  prestamos,
  salidas,
  solicitudesPrestamo,
} from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import {
  diasDeAtraso,
  formatearCLP,
  formatearFecha,
  formatearFechaHora,
  MESES,
} from "@/lib/utils";
import {
  DIFICULTAD,
  ESTADO_CUOTA,
  ESTADO_PRESTAMO,
  ESTADO_SALIDA,
  Fila,
  Insignia,
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
import { CancelarSolicitud } from "./cancelar";

export const metadata = { title: "Mi actividad" };

export default async function PaginaMiActividad() {
  const usuario = await requerirUsuario();

  const [misSalidas, misPrestamos, misCuotas] = await Promise.all([
    db
      .select({
        inscripcionId: inscripciones.id,
        fechaInscripcion: inscripciones.fechaInscripcion,
        asistio: inscripciones.asistio,
        nombre: salidas.nombre,
        lugar: salidas.lugar,
        fechaSalida: salidas.fechaSalida,
        dificultad: salidas.nivelDificultad,
        estado: salidas.estado,
      })
      .from(inscripciones)
      .innerJoin(salidas, eq(inscripciones.salidaId, salidas.id))
      .where(eq(inscripciones.usuarioId, usuario.id))
      .orderBy(desc(salidas.fechaSalida)),

    // Una fila por equipo, con los datos del pedido al que pertenece. Se
    // agrupan más abajo: el socio pide, cancela y devuelve por pedido, aunque
    // cada equipo tenga su propia respuesta.
    db
      .select({
        id: prestamos.id,
        solicitudId: prestamos.solicitudId,
        estado: prestamos.estado,
        fechaSolicitud: solicitudesPrestamo.fechaSolicitud,
        fechaDesde: solicitudesPrestamo.fechaDesde,
        fechaHasta: solicitudesPrestamo.fechaHasta,
        motivo: solicitudesPrestamo.motivo,
        notaResolucion: prestamos.notaResolucion,
        fechaDevolucion: prestamos.fechaDevolucion,
        equipoNombre: equipos.nombre,
      })
      .from(prestamos)
      .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
      .innerJoin(solicitudesPrestamo, eq(prestamos.solicitudId, solicitudesPrestamo.id))
      .where(eq(solicitudesPrestamo.usuarioId, usuario.id))
      .orderBy(desc(solicitudesPrestamo.fechaSolicitud), equipos.nombre),

    db
      .select()
      .from(cuotasMensuales)
      .where(eq(cuotasMensuales.usuarioId, usuario.id))
      .orderBy(desc(cuotasMensuales.anio), desc(cuotasMensuales.mes)),
  ]);

  // Los equipos vienen ordenados por pedido; agruparlos es recorrer una vez y
  // abrir un grupo nuevo cuando cambia la solicitud.
  const misPedidos: {
    id: number;
    fechaSolicitud: Date;
    fechaDesde: string;
    fechaHasta: string;
    motivo: string;
    items: typeof misPrestamos;
  }[] = [];

  for (const item of misPrestamos) {
    const ultimo = misPedidos[misPedidos.length - 1];
    if (ultimo?.id === item.solicitudId) ultimo.items.push(item);
    else {
      misPedidos.push({
        id: item.solicitudId,
        fechaSolicitud: item.fechaSolicitud,
        fechaDesde: item.fechaDesde,
        fechaHasta: item.fechaHasta,
        motivo: item.motivo,
        items: [item],
      });
    }
  }

  const asistidas = misSalidas.filter((s) => s.asistio).length;
  const totalPagado = misCuotas.reduce((a, c) => a + c.montoPagado, 0);
  const porPagar = misCuotas.reduce((a, c) => a + (c.montoEsperado - c.montoPagado), 0);

  return (
    <>
      <CabeceraPagina
        titulo="Mi actividad"
        descripcion="Tu historial completo en el club: salidas, equipo y cuotas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          etiqueta="Salidas inscritas"
          valor={misSalidas.length}
          detalle={`${asistidas} con asistencia confirmada`}
          icono={<Mountain aria-hidden />}
        />
        <Metrica
          etiqueta="Equipos pedidos"
          valor={misPrestamos.length}
          detalle="En toda tu historia en el club"
          icono={<Backpack aria-hidden />}
        />
        <Metrica
          etiqueta="Total aportado"
          valor={formatearCLP(totalPagado)}
          icono={<Wallet aria-hidden />}
          tono="positivo"
        />
        <Metrica
          etiqueta="Pendiente"
          valor={formatearCLP(porPagar)}
          icono={<Activity aria-hidden />}
          tono={porPagar > 0 ? "atencion" : "positivo"}
        />
      </div>

      {/* ------------------------------ Salidas ------------------------------ */}

      <Tarjeta>
        <TarjetaCabecera titulo="Mis salidas" descripcion="Donde te has inscrito" />
        {misSalidas.length === 0 ? (
          <Vacio
            icono={<Mountain aria-hidden />}
            titulo="Aún no te inscribes en ninguna salida"
            descripcion="Cuando lo hagas, tu historial aparecerá acá."
          />
        ) : (
          <Tabla>
            <TablaCabecera>
              <tr>
                <Th>Salida</Th>
                <Th>Fecha</Th>
                <Th>Dificultad</Th>
                <Th>Estado</Th>
                <Th>Asistencia</Th>
              </tr>
            </TablaCabecera>
            <TablaCuerpo>
              {misSalidas.map((s) => (
                <Fila key={s.inscripcionId}>
                  <Td>
                    <p className="font-medium text-stone-900">{s.nombre}</p>
                    {s.lugar && <p className="text-xs text-stone-500">{s.lugar}</p>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatearFechaHora(s.fechaSalida)}
                  </Td>
                  <Td>
                    <InsigniaEstado mapa={DIFICULTAD} valor={s.dificultad} />
                  </Td>
                  <Td>
                    <InsigniaEstado mapa={ESTADO_SALIDA} valor={s.estado} />
                  </Td>
                  <Td>
                    {s.asistio ? (
                      <Insignia tono="exito">Asististe</Insignia>
                    ) : (
                      <span className="text-xs text-stone-400">Sin registrar</span>
                    )}
                  </Td>
                </Fila>
              ))}
            </TablaCuerpo>
          </Tabla>
        )}
      </Tarjeta>

      {/* ----------------------------- Préstamos ----------------------------- */}

      <Tarjeta>
        <TarjetaCabecera
          titulo="Mis préstamos"
          descripcion="Equipo del club que has solicitado"
        />
        {misPedidos.length === 0 ? (
          <Vacio
            icono={<Backpack aria-hidden />}
            titulo="No has pedido equipo"
            descripcion="Puedes solicitarlo desde la sección Equipos."
          />
        ) : (
          <div className="divide-y divide-stone-200">
            {misPedidos.map((pedido) => {
              const pendientes = pedido.items.filter(
                (i) => i.estado === "pendiente",
              ).length;
              const atraso = diasDeAtraso(pedido.fechaHasta);
              const enSuPoder = pedido.items.some((i) => i.estado === "aprobado");

              return (
                <section key={pedido.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-stone-700">
                        {formatearFecha(pedido.fechaDesde)}
                        <span className="text-stone-400"> → </span>
                        <span
                          className={
                            atraso > 0 && enSuPoder
                              ? "font-medium text-red-700"
                              : undefined
                          }
                        >
                          {formatearFecha(pedido.fechaHasta)}
                        </span>
                      </p>
                      <p className="text-xs text-stone-500">
                        {pedido.items.length === 1
                          ? "1 equipo"
                          : `${pedido.items.length} equipos`}
                        , pedidos el {formatearFecha(pedido.fechaSolicitud)}
                      </p>
                      <p className="mt-1 max-w-prose text-sm text-stone-600 italic">
                        “{pedido.motivo}”
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {atraso > 0 && enSuPoder && (
                        <Insignia tono="alerta">
                          <AlarmClock className="size-3" aria-hidden />
                          Devolución vencida
                        </Insignia>
                      )}
                      {/* Mientras nadie haya respondido, el pedido es del socio
                          y puede retirarlo. Después ya no: lo aprobado se
                          devuelve, no se cancela. */}
                      {pendientes > 0 && (
                        <CancelarSolicitud
                          solicitudId={pedido.id}
                          pendientes={pendientes}
                        />
                      )}
                    </div>
                  </div>

                  <ul className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200">
                    {pedido.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-stone-800">
                            {item.equipoNombre}
                          </p>
                          {item.notaResolucion && (
                            <p className="truncate text-xs text-stone-500 italic">
                              Respuesta: {item.notaResolucion}
                            </p>
                          )}
                          {item.fechaDevolucion && (
                            <p className="text-xs text-stone-500">
                              Devuelto el {formatearFecha(item.fechaDevolucion)}
                            </p>
                          )}
                        </div>
                        <InsigniaEstado mapa={ESTADO_PRESTAMO} valor={item.estado} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Tarjeta>

      {/* ------------------------------ Cuotas ------------------------------- */}

      <Tarjeta>
        <TarjetaCabecera
          titulo="Mis cuotas"
          descripcion="Historial completo de mensualidades"
        />
        {misCuotas.length === 0 ? (
          <Vacio
            icono={<Wallet aria-hidden />}
            titulo="Sin cuotas registradas"
            descripcion="La tesorería aún no genera cuotas a tu nombre."
          />
        ) : (
          <Tabla>
            <TablaCabecera>
              <tr>
                <Th>Período</Th>
                <Th className="text-right">Cuota</Th>
                <Th className="text-right">Pagado</Th>
                <Th>Estado</Th>
                <Th>Fecha de pago</Th>
                <Th>Observaciones</Th>
              </tr>
            </TablaCabecera>
            <TablaCuerpo>
              {misCuotas.map((c) => (
                <Fila key={c.id}>
                  <Td className="whitespace-nowrap">
                    <span className="font-medium text-stone-900">
                      {MESES[c.mes - 1]}
                    </span>{" "}
                    <span className="tabular text-stone-500">{c.anio}</span>
                  </Td>
                  <Td className="tabular text-right whitespace-nowrap">
                    {formatearCLP(c.montoEsperado)}
                  </Td>
                  <Td className="tabular text-right whitespace-nowrap">
                    {formatearCLP(c.montoPagado)}
                  </Td>
                  <Td>
                    <InsigniaEstado mapa={ESTADO_CUOTA} valor={c.estado} />
                  </Td>
                  <Td className="whitespace-nowrap">{formatearFecha(c.fechaPago)}</Td>
                  <Td>
                    <p className="line-clamp-1 max-w-xs text-xs">
                      {c.observaciones ?? "—"}
                    </p>
                  </Td>
                </Fila>
              ))}
            </TablaCuerpo>
          </Tabla>
        )}
      </Tarjeta>
    </>
  );
}
