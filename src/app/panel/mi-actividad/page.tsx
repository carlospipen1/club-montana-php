import { desc, eq } from "drizzle-orm";
import { Activity, AlarmClock, Backpack, Mountain, Wallet } from "lucide-react";

import { db } from "@/db";
import {
  cuotasMensuales,
  equipos,
  inscripciones,
  prestamos,
  salidas,
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

    db
      .select({
        id: prestamos.id,
        estado: prestamos.estado,
        fechaSolicitud: prestamos.fechaSolicitud,
        fechaDesde: prestamos.fechaDesde,
        fechaHasta: prestamos.fechaHasta,
        motivo: prestamos.motivo,
        notaResolucion: prestamos.notaResolucion,
        equipoNombre: equipos.nombre,
      })
      .from(prestamos)
      .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
      .where(eq(prestamos.usuarioId, usuario.id))
      .orderBy(desc(prestamos.fechaSolicitud)),

    db
      .select()
      .from(cuotasMensuales)
      .where(eq(cuotasMensuales.usuarioId, usuario.id))
      .orderBy(desc(cuotasMensuales.anio), desc(cuotasMensuales.mes)),
  ]);

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
          etiqueta="Préstamos"
          valor={misPrestamos.length}
          detalle="Solicitudes históricas"
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
        {misPrestamos.length === 0 ? (
          <Vacio
            icono={<Backpack aria-hidden />}
            titulo="No has pedido equipo"
            descripcion="Puedes solicitarlo desde la sección Equipos."
          />
        ) : (
          <Tabla>
            <TablaCabecera>
              <tr>
                <Th>Equipo</Th>
                <Th>Solicitado</Th>
                <Th>Período</Th>
                <Th>Motivo</Th>
                <Th>Estado</Th>
              </tr>
            </TablaCabecera>
            <TablaCuerpo>
              {misPrestamos.map((p) => (
                <Fila key={p.id}>
                  <Td className="font-medium text-stone-900">{p.equipoNombre}</Td>
                  <Td className="whitespace-nowrap">
                    {formatearFecha(p.fechaSolicitud)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatearFecha(p.fechaDesde)}
                    <span className="text-stone-400"> → </span>
                    {formatearFecha(p.fechaHasta)}
                  </Td>
                  <Td>
                    <p className="line-clamp-2 max-w-xs text-xs">{p.motivo}</p>
                    {p.notaResolucion && (
                      <p className="mt-1 line-clamp-2 max-w-xs text-xs text-stone-500 italic">
                        Respuesta: {p.notaResolucion}
                      </p>
                    )}
                  </Td>
                  <Td>
                    {p.estado === "aprobado" && diasDeAtraso(p.fechaHasta) > 0 ? (
                      <Insignia tono="alerta">
                        <AlarmClock className="size-3" aria-hidden />
                        Devolución vencida
                      </Insignia>
                    ) : (
                      <InsigniaEstado mapa={ESTADO_PRESTAMO} valor={p.estado} />
                    )}
                  </Td>
                </Fila>
              ))}
            </TablaCuerpo>
          </Tabla>
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
