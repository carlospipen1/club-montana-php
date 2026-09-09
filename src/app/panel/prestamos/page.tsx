import { desc, eq } from "drizzle-orm";
import { AlarmClock, Backpack, ClipboardCheck } from "lucide-react";

import { db } from "@/db";
import {
  equipos,
  estadoPrestamoEnum,
  prestamos,
  solicitudesPrestamo,
  usuarios,
} from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { diasDeAtraso, formatearFecha, formatearFechaHora } from "@/lib/utils";
import { ESTADO_PRESTAMO, Insignia, InsigniaEstado } from "@/components/ui/datos";
import {
  CabeceraPagina,
  Metrica,
  Tarjeta,
  TarjetaCabecera,
  Vacio,
} from "@/components/ui/superficie";
import { Aviso } from "@/components/ui/avisos";
import { ResolverPrestamo, ResolverSolicitud } from "./resolver";

export const metadata = { title: "Préstamos" };

type Item = {
  id: number;
  solicitudId: number;
  estado: (typeof estadoPrestamoEnum.enumValues)[number];
  notaResolucion: string | null;
  fechaDevolucion: Date | null;
  equipoNombre: string;
};

type Solicitud = {
  id: number;
  fechaSolicitud: Date;
  fechaDesde: string;
  fechaHasta: string;
  motivo: string;
  socioNombres: string;
  socioApellidos: string;
  items: Item[];
};

export default async function PaginaPrestamos() {
  await requerirCapacidad("gestionarPrestamos");

  // Dos consultas y el agrupado en memoria, en vez de una con agregación: son
  // decenas de filas, y así cada consulta se lee de corrido.
  const [cabeceras, items] = await Promise.all([
    db
      .select({
        id: solicitudesPrestamo.id,
        fechaSolicitud: solicitudesPrestamo.fechaSolicitud,
        fechaDesde: solicitudesPrestamo.fechaDesde,
        fechaHasta: solicitudesPrestamo.fechaHasta,
        motivo: solicitudesPrestamo.motivo,
        socioNombres: usuarios.nombres,
        socioApellidos: usuarios.apellidos,
      })
      .from(solicitudesPrestamo)
      .innerJoin(usuarios, eq(solicitudesPrestamo.usuarioId, usuarios.id))
      .orderBy(desc(solicitudesPrestamo.fechaSolicitud)),

    db
      .select({
        id: prestamos.id,
        solicitudId: prestamos.solicitudId,
        estado: prestamos.estado,
        notaResolucion: prestamos.notaResolucion,
        fechaDevolucion: prestamos.fechaDevolucion,
        equipoNombre: equipos.nombre,
      })
      .from(prestamos)
      .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
      .orderBy(equipos.nombre),
  ]);

  const porSolicitud = new Map<number, Item[]>();
  for (const item of items) {
    const grupo = porSolicitud.get(item.solicitudId);
    if (grupo) grupo.push(item);
    else porSolicitud.set(item.solicitudId, [item]);
  }

  const solicitudes: Solicitud[] = cabeceras.map((c) => ({
    ...c,
    items: porSolicitud.get(c.id) ?? [],
  }));

  const cuenta = (s: Solicitud, estado: Item["estado"]) =>
    s.items.filter((i) => i.estado === estado).length;

  // El estado de una solicitud no se guarda: se deduce de sus ítems. Mientras
  // quede uno pendiente hay algo que responder; si no queda ninguno pendiente
  // pero sí aprobados, el equipo está en la calle; y si no queda ni lo uno ni
  // lo otro, el pedido está cerrado.
  const porRevisar = solicitudes.filter((s) => cuenta(s, "pendiente") > 0);
  const enCurso = solicitudes.filter(
    (s) => cuenta(s, "pendiente") === 0 && cuenta(s, "aprobado") > 0,
  );
  const cerradas = solicitudes.filter(
    (s) => cuenta(s, "pendiente") === 0 && cuenta(s, "aprobado") === 0,
  );

  const atrasadas = enCurso
    .filter((s) => diasDeAtraso(s.fechaHasta) > 0)
    .sort((a, b) => diasDeAtraso(b.fechaHasta) - diasDeAtraso(a.fechaHasta));
  const alDia = enCurso.filter((s) => diasDeAtraso(s.fechaHasta) === 0);

  const equiposEnLaCalle = items.filter((i) => i.estado === "aprobado").length;

  return (
    <>
      <CabeceraPagina
        titulo="Préstamos de equipo"
        descripcion="Cada solicitud trae adentro el equipo que se pidió. Puedes responder cosa por cosa."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          etiqueta="Por revisar"
          valor={porRevisar.length}
          detalle={porRevisar.length > 0 ? "Esperan tu respuesta" : "Nada pendiente"}
          icono={<ClipboardCheck aria-hidden />}
          tono={porRevisar.length > 0 ? "atencion" : "positivo"}
        />
        <Metrica
          etiqueta="Atrasadas"
          valor={atrasadas.length}
          detalle={
            atrasadas.length > 0
              ? `La más antigua, ${diasDeAtraso(atrasadas[0].fechaHasta)} día(s)`
              : "Ninguna vencida"
          }
          icono={<AlarmClock aria-hidden />}
          tono={atrasadas.length > 0 ? "alerta" : "positivo"}
        />
        <Metrica
          etiqueta="Equipos prestados"
          valor={equiposEnLaCalle}
          detalle="Fuera del inventario"
          icono={<Backpack aria-hidden />}
        />
        <Metrica etiqueta="Historial" valor={cerradas.length} detalle="Ya cerradas" />
      </div>

      {atrasadas.length > 0 && (
        <Aviso tono="error" titulo="Hay equipo con la devolución vencida">
          {atrasadas.length === 1
            ? "Un pedido pasó su fecha de devolución y esos equipos siguen figurando como prestados. "
            : `${atrasadas.length} pedidos pasaron su fecha de devolución y esos equipos siguen figurando como prestados. `}
          Si ya te los entregaron, márcalos como devueltos para que vuelvan al
          inventario.
        </Aviso>
      )}

      <Tarjeta>
        <TarjetaCabecera
          titulo="Solicitudes pendientes"
          descripcion="Esperan tu respuesta. Puedes aprobar unas cosas y rechazar otras."
        />
        {porRevisar.length === 0 ? (
          <Vacio
            icono={<ClipboardCheck aria-hidden />}
            titulo="Nada pendiente"
            descripcion="No hay solicitudes esperando revisión."
          />
        ) : (
          <div className="divide-y divide-stone-200">
            {porRevisar.map((s) => (
              <FichaSolicitud key={s.id} solicitud={s} modo="revisar" />
            ))}
          </div>
        )}
      </Tarjeta>

      {atrasadas.length > 0 && (
        <Tarjeta className="ring-1 ring-red-200">
          <TarjetaCabecera
            titulo="Devolución vencida"
            descripcion="Ordenadas de la más atrasada a la más reciente"
            className="bg-red-50/60"
            accion={
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
                <AlarmClock className="size-4" aria-hidden />
                {atrasadas.length}
              </span>
            }
          />
          <div className="divide-y divide-stone-200">
            {atrasadas.map((s) => (
              <FichaSolicitud key={s.id} solicitud={s} modo="devolver" />
            ))}
          </div>
        </Tarjeta>
      )}

      {alDia.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera
            titulo="Equipo en préstamo"
            descripcion="Aprobados y dentro del plazo"
          />
          <div className="divide-y divide-stone-200">
            {alDia.map((s) => (
              <FichaSolicitud key={s.id} solicitud={s} modo="devolver" />
            ))}
          </div>
        </Tarjeta>
      )}

      {cerradas.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera titulo="Historial" descripcion="Solicitudes ya cerradas" />
          <div className="divide-y divide-stone-200">
            {cerradas.map((s) => (
              <FichaSolicitud key={s.id} solicitud={s} modo="cerrada" />
            ))}
          </div>
        </Tarjeta>
      )}
    </>
  );
}

/**
 * Una solicitud con su equipo desplegado adentro.
 *
 * El encabezado dice quién pidió, para cuándo y para qué —eso es del pedido
 * completo—, y cada equipo trae su propio estado y sus propios botones. Los
 * botones del encabezado aplican la misma decisión a todo lo que quede
 * aplicable, que es el caso normal.
 */
function FichaSolicitud({
  solicitud: s,
  modo,
}: {
  solicitud: Solicitud;
  modo: "revisar" | "devolver" | "cerrada";
}) {
  const socio = `${s.socioNombres} ${s.socioApellidos}`;
  const atraso = diasDeAtraso(s.fechaHasta);
  const pendientes = s.items.filter((i) => i.estado === "pendiente").length;
  const aprobados = s.items.filter((i) => i.estado === "aprobado").length;

  return (
    <section id={`solicitud-${s.id}`} className="px-5 py-4 scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-stone-900">{socio}</p>
          <p className="text-xs text-stone-500">
            Pidió {s.items.length === 1 ? "1 equipo" : `${s.items.length} equipos`} el{" "}
            {formatearFechaHora(s.fechaSolicitud)}
          </p>
          <p className="mt-2 text-sm text-stone-700">
            {formatearFecha(s.fechaDesde)}
            <span className="text-stone-400"> → </span>
            <span
              className={
                atraso > 0 && aprobados > 0 ? "font-medium text-red-700" : undefined
              }
            >
              {formatearFecha(s.fechaHasta)}
            </span>
          </p>
          <p className="mt-1 max-w-prose text-sm text-stone-600 italic">“{s.motivo}”</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {atraso > 0 && aprobados > 0 && (
            <Insignia tono="alerta">
              <AlarmClock className="size-3" aria-hidden />
              {atraso === 1 ? "1 día de atraso" : `${atraso} días de atraso`}
            </Insignia>
          )}

          {modo === "revisar" && pendientes > 1 && (
            <div className="flex items-center gap-1.5">
              <ResolverSolicitud
                solicitudId={s.id}
                decision="aprobado"
                resumen={`Se aprueban los ${pendientes} equipos pendientes del pedido de ${socio}.`}
              />
              <ResolverSolicitud
                solicitudId={s.id}
                decision="rechazado"
                resumen={`Se rechazan los ${pendientes} equipos pendientes del pedido de ${socio}.`}
              />
            </div>
          )}

          {modo === "devolver" && aprobados > 1 && (
            <ResolverSolicitud
              solicitudId={s.id}
              decision="devuelto"
              resumen={`Vuelven al inventario los ${aprobados} equipos que ${socio} tiene en su poder.`}
            />
          )}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200">
        {s.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-stone-800">{item.equipoNombre}</p>
              {item.notaResolucion && (
                <p className="truncate text-xs text-stone-500 italic">
                  Nota: {item.notaResolucion}
                </p>
              )}
              {item.fechaDevolucion && (
                <p className="text-xs text-stone-500">
                  Devuelto el {formatearFechaHora(item.fechaDevolucion)}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <InsigniaEstado mapa={ESTADO_PRESTAMO} valor={item.estado} />

              {item.estado === "pendiente" && (
                <>
                  <ResolverPrestamo
                    prestamoId={item.id}
                    decision="aprobado"
                    resumen={`${socio} pide "${item.equipoNombre}".`}
                  />
                  <ResolverPrestamo
                    prestamoId={item.id}
                    decision="rechazado"
                    resumen={`${socio} pide "${item.equipoNombre}".`}
                  />
                </>
              )}

              {item.estado === "aprobado" && (
                <ResolverPrestamo
                  prestamoId={item.id}
                  decision="devuelto"
                  resumen={`Devolución de "${item.equipoNombre}" por ${socio}${atraso > 0 ? `, con ${atraso} día(s) de atraso` : ""}.`}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
