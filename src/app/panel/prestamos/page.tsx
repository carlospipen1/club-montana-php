import { desc, eq } from "drizzle-orm";
import { AlarmClock, Backpack, ChevronRight, ClipboardCheck } from "lucide-react";

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
import { SinPropagar } from "@/components/ui/acciones";
import { ResolverPrestamo, ResolverSolicitud } from "./resolver";

export const metadata = { title: "Préstamos" };

type Item = {
  id: number;
  solicitudId: number;
  equipoId: number;
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
        equipoId: prestamos.equipoId,
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

  // Quién más está pidiendo lo mismo.
  //
  // Pedir ya no bloquea a nadie —a quién se le presta lo decide quien lleva los
  // equipos—, pero entonces hay que mostrarlo: si dos socios quieren la misma
  // carpa para el mismo fin de semana y eso no se ve, se aprueba el primero que
  // aparece y el segundo se vuelve imposible sin que nadie entienda por qué.
  const disputas = new Map<number, string[]>();
  const pendientesConFecha = solicitudes.flatMap((s) =>
    s.items
      .filter((i) => i.estado === "pendiente")
      .map((i) => ({ item: i, solicitud: s })),
  );

  for (const { item, solicitud } of pendientesConFecha) {
    const otros = pendientesConFecha.filter(
      (o) =>
        o.item.equipoId === item.equipoId &&
        o.solicitud.id !== solicitud.id &&
        o.solicitud.fechaDesde <= solicitud.fechaHasta &&
        o.solicitud.fechaHasta >= solicitud.fechaDesde,
    );
    if (otros.length > 0) {
      disputas.set(
        item.id,
        otros.map(
          (o) =>
            `${o.solicitud.socioNombres} ${o.solicitud.socioApellidos} (${formatearFecha(o.solicitud.fechaDesde)} → ${formatearFecha(o.solicitud.fechaHasta)})`,
        ),
      );
    }
  }

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
              <FichaSolicitud key={s.id} solicitud={s} modo="revisar" disputas={disputas} />
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
              <FichaSolicitud key={s.id} solicitud={s} modo="devolver" disputas={disputas} />
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
              <FichaSolicitud key={s.id} solicitud={s} modo="devolver" disputas={disputas} />
            ))}
          </div>
        </Tarjeta>
      )}

      {cerradas.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera titulo="Historial" descripcion="Solicitudes ya cerradas" />
          <div className="divide-y divide-stone-200">
            {cerradas.map((s) => (
              <FichaSolicitud key={s.id} solicitud={s} modo="cerrada" disputas={disputas} />
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
  disputas,
}: {
  solicitud: Solicitud;
  modo: "revisar" | "devolver" | "cerrada";
  /** Por id de préstamo, quién más pidió ese equipo para fechas que se cruzan. */
  disputas: Map<number, string[]>;
}) {
  const socio = `${s.socioNombres} ${s.socioApellidos}`;
  const atraso = diasDeAtraso(s.fechaHasta);
  const pendientes = s.items.filter((i) => i.estado === "pendiente").length;
  const aprobados = s.items.filter((i) => i.estado === "aprobado").length;
  const cuantos = s.items.length;
  const enDisputa = s.items.filter((i) => disputas.has(i.id)).length;

  return (
    // Colapsada de entrada. Un pedido de veinte cosas ocupa una pantalla
    // completa, y con unas cuantas solicitudes acumuladas la página deja de
    // servir para lo que sirve: mirar la lista y elegir cuál atender. Por eso
    // el resumen carga lo necesario para decidir —quién, cuándo, para qué y
    // cuánto— y los botones del pedido completo, que resuelven el caso normal
    // sin desplegar nada. Se despliega para tratar los equipos uno por uno.
    <details
      id={`solicitud-${s.id}`}
      className="group scroll-mt-20 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer flex-wrap items-start justify-between gap-3 list-none">
        <div className="flex min-w-0 items-start gap-2">
          <ChevronRight
            className="mt-0.5 size-4 shrink-0 text-stone-400 transition-transform group-open:rotate-90"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-medium text-stone-900">{socio}</p>
            <p className="text-xs text-stone-500">
              {cuantos === 1 ? "1 equipo" : `${cuantos} equipos`}
              {pendientes > 0 && cuantos !== pendientes && ` · ${pendientes} sin responder`}
              {" · pedidos el "}
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
            <p className="mt-1 max-w-prose text-sm text-stone-600 italic">
              “{s.motivo}”
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {atraso > 0 && aprobados > 0 && (
            <Insignia tono="alerta">
              <AlarmClock className="size-3" aria-hidden />
              {atraso === 1 ? "1 día de atraso" : `${atraso} días de atraso`}
            </Insignia>
          )}

          {/* Con la ficha cerrada, esto es lo único que avisa que hay alguien
              más esperando lo mismo. Sin la marca habría que abrirlas todas
              para enterarse. */}
          {enDisputa > 0 && (
            <Insignia tono="atencion">
              {enDisputa === 1
                ? "1 equipo lo pidió alguien más"
                : `${enDisputa} equipos los pidió alguien más`}
            </Insignia>
          )}

          {/* Los botones del pedido completo salen aunque quede una sola cosa:
              si sólo aparecieran con dos o más, un pedido de un equipo obligaría
              a desplegar la ficha para poder responderlo. */}
          {modo === "revisar" && pendientes > 0 && (
            <SinPropagar>
              <ResolverSolicitud
                solicitudId={s.id}
                decision="aprobado"
                cuantos={pendientes}
                resumen={
                  pendientes === 1
                    ? `Se aprueba el equipo pendiente del pedido de ${socio}.`
                    : `Se aprueban los ${pendientes} equipos pendientes del pedido de ${socio}.`
                }
              />
              <ResolverSolicitud
                solicitudId={s.id}
                decision="rechazado"
                cuantos={pendientes}
                resumen={
                  pendientes === 1
                    ? `Se rechaza el equipo pendiente del pedido de ${socio}.`
                    : `Se rechazan los ${pendientes} equipos pendientes del pedido de ${socio}.`
                }
              />
            </SinPropagar>
          )}

          {modo === "devolver" && aprobados > 0 && (
            <SinPropagar>
              <ResolverSolicitud
                solicitudId={s.id}
                decision="devuelto"
                cuantos={aprobados}
                resumen={
                  aprobados === 1
                    ? `Vuelve al inventario el equipo que ${socio} tiene en su poder.`
                    : `Vuelven al inventario los ${aprobados} equipos que ${socio} tiene en su poder.`
                }
              />
            </SinPropagar>
          )}
        </div>
      </summary>

      <ul className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200">
        {s.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-stone-800">{item.equipoNombre}</p>
              {disputas.get(item.id)?.map((otro) => (
                <p key={otro} className="text-xs text-amber-800">
                  También lo pidió {otro}
                </p>
              ))}
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
    </details>
  );
}
