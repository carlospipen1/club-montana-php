import { and, asc, eq, gte } from "drizzle-orm";
import { Backpack, Search, Trash2 } from "lucide-react";

import { accionEliminarEquipo } from "@/actions/equipos";
import { db } from "@/db";
import { equipos, prestamos, solicitudesPrestamo, usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { formatearFecha, hoyISO } from "@/lib/utils";
import { ConfirmarEnvio } from "@/components/ui/acciones";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import {
  Fila,
  Insignia,
  Tabla,
  TablaCabecera,
  TablaCuerpo,
  Td,
  Th,
} from "@/components/ui/datos";
import { CabeceraPagina, Tarjeta, Vacio } from "@/components/ui/superficie";
import { EditarEquipo, NuevoEquipo } from "./formularios";
import {
  BarraPedido,
  CasillaEquipo,
  ProveedorPedido,
  type PedidoPendiente,
} from "./pedido";
import {
  BuscadorLista,
  FilaLista,
  Paginador,
  ProveedorLista,
  SinCoincidencias,
} from "@/components/panel/lista-filtrable";

export const metadata = { title: "Equipos" };

export default async function PaginaEquipos() {
  const usuario = await requerirUsuario();
  const puedeGestionar = puede(usuario.rol, "gestionarEquipos");

  // El inventario entero, sin filtrar en la consulta: la búsqueda y la
  // paginación ocurren en el navegador —ver `lista-filtrable.tsx`—, porque
  // recargar la página para buscar borraba lo que la persona llevaba marcado.
  const lista = await db
    .select()
    .from(equipos)
    .orderBy(asc(equipos.categoria), asc(equipos.nombre));

  // Los compromisos vivos de cada equipo. De acá sale si algo está afuera y
  // hasta cuándo, que es lo que la columna `estado` decía mal —una carpa
  // prestada hasta el 15 figuraba como no disponible para pedirla en noviembre—.
  //
  // Se toman **todos** los aprobados, incluidos los que ya pasaron su fecha:
  // aprobado significa que el equipo salió y nadie registró su vuelta, así que
  // sigue afuera. Filtrarlos por fecha los hacía reaparecer como disponibles el
  // día después de vencer, que es justo cuando menos se sabe dónde están.
  const hoy = hoyISO();
  const compromisos = await db
    .select({
      equipoId: prestamos.equipoId,
      desde: solicitudesPrestamo.fechaDesde,
      hasta: solicitudesPrestamo.fechaHasta,
    })
    .from(prestamos)
    .innerJoin(solicitudesPrestamo, eq(prestamos.solicitudId, solicitudesPrestamo.id))
    .where(eq(prestamos.estado, "aprobado"))
    .orderBy(asc(solicitudesPrestamo.fechaDesde));

  // El primero de cada equipo: el que está en curso, o el más próximo.
  const compromiso = new Map<number, { desde: string; hasta: string }>();
  for (const c of compromisos) {
    if (!compromiso.has(c.equipoId)) {
      compromiso.set(c.equipoId, { desde: c.desde, hasta: c.hasta });
    }
  }

  // Lo que otros ya pidieron y nadie ha respondido todavía.
  //
  // Un pedido pendiente no reserva nada —a quién se le presta lo decide quien
  // lleva los equipos—, pero quien está armando el suyo necesita verlo: si la
  // carpa ya se la pidió alguien para el mismo fin de semana, lo razonable es
  // hablarlo antes y no que los dos se enteren cuando el encargado tenga que
  // elegir. Es la diferencia entre coordinarse y toparse.
  const pedidosPendientes = await db
    .select({
      equipoId: prestamos.equipoId,
      usuarioId: solicitudesPrestamo.usuarioId,
      desde: solicitudesPrestamo.fechaDesde,
      hasta: solicitudesPrestamo.fechaHasta,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(prestamos)
    .innerJoin(solicitudesPrestamo, eq(prestamos.solicitudId, solicitudesPrestamo.id))
    .innerJoin(usuarios, eq(solicitudesPrestamo.usuarioId, usuarios.id))
    .where(and(eq(prestamos.estado, "pendiente"), gte(solicitudesPrestamo.fechaHasta, hoy)))
    .orderBy(asc(solicitudesPrestamo.fechaDesde));

  const pendientesPorEquipo = new Map<number, PedidoPendiente[]>();
  for (const p of pedidosPendientes) {
    const lista = pendientesPorEquipo.get(p.equipoId) ?? [];
    lista.push({
      mio: p.usuarioId === usuario.id,
      quien: `${p.nombres} ${p.apellidos}`,
      desde: p.desde,
      hasta: p.hasta,
    });
    pendientesPorEquipo.set(p.equipoId, lista);
  }

  const libresHoy = lista.filter((e) => {
    if (e.estado === "mantencion") return false;
    const c = compromiso.get(e.id);
    return !c || c.desde > hoy;
  }).length;

  const buscables = lista.map((e) => ({
    id: e.id,
    texto: `${e.nombre} ${e.categoria} ${e.descripcion ?? ""}`,
  }));

  return (
    <ProveedorPedido>
      <ProveedorLista filas={buscables} porPagina={25}>
        <CabeceraPagina
          titulo="Equipos del club"
          descripcion={`${libresHoy} libre(s) hoy de ${lista.length} en inventario. Marca lo que necesites y pídelo todo junto: lo que está prestado también se puede pedir para después.`}
        >
          {/* Desde acá se pide, así que desde acá tiene que poder verse lo ya
              pedido: es la primera pregunta después de mandar el primer pedido. */}
          <BotonEnlace href="/panel/mi-actividad" variante="outline">
            <Backpack aria-hidden />
            Mis pedidos
          </BotonEnlace>
          {puedeGestionar && <NuevoEquipo />}
        </CabeceraPagina>

        <Tarjeta>
          <div className="border-b border-stone-200 px-5 py-3">
            <BuscadorLista
              marcador="Buscar por nombre, categoría o descripción…"
              nota="Lo que ya marcaste sigue en tu pedido aunque no se vea acá."
            />
          </div>

          {lista.length === 0 ? (
            <Vacio
              icono={<Backpack aria-hidden />}
              titulo="El inventario está vacío"
              descripcion="Cuando la directiva cargue el equipo del club, aparecerá acá."
            />
          ) : (
            <Tabla>
              <TablaCabecera>
                <tr>
                  {/* La columna lleva título: sin él, una casilla suelta no dice
                      para qué sirve, y el botón de pedir ya no está en la fila. */}
                  <Th className="w-14">Pedir</Th>
                  <Th>Equipo</Th>
                  <Th>Categoría</Th>
                  <Th>Estado</Th>
                  <Th>Adquirido</Th>
                  {/* Editar y eliminar son de quien administra el inventario. A
                      los demás la columna les salía vacía, prometiendo acciones
                      que no existen. */}
                  {puedeGestionar && <Th className="text-right">Acciones</Th>}
                </tr>
              </TablaCabecera>
              <TablaCuerpo>
                {lista.map((equipo) => (
                  <FilaLista key={equipo.id} id={equipo.id}>
                    <Fila>
                      <Td>
                        {/* Lo único que impide marcar un equipo es la mantención.
                            Que esté prestado no: se puede pedir para un fin de
                            semana posterior, y si las fechas se cruzan lo dice el
                            servidor al enviar el pedido. */}
                        <CasillaEquipo
                          id={equipo.id}
                          nombre={equipo.nombre}
                          deshabilitada={equipo.estado === "mantencion"}
                        />
                      </Td>
                      <Td>
                        <p className="font-medium text-stone-900">{equipo.nombre}</p>
                        {equipo.descripcion && (
                          <p className="line-clamp-1 max-w-xs text-xs text-stone-500">
                            {equipo.descripcion}
                          </p>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">{equipo.categoria}</Td>
                      <Td className="whitespace-nowrap">
                        <Disponibilidad
                          enMantencion={equipo.estado === "mantencion"}
                          compromiso={compromiso.get(equipo.id)}
                          hoy={hoy}
                        />
                        <YaLoPidieron pedidos={pendientesPorEquipo.get(equipo.id)} />
                      </Td>
                      <Td className="whitespace-nowrap">
                        {formatearFecha(equipo.fechaAdquisicion)}
                      </Td>
                      {puedeGestionar && (
                        <Td>
                          <div className="flex items-center justify-end gap-1">
                            <EditarEquipo equipo={equipo} />
                            <ConfirmarEnvio
                              mensaje={`¿Eliminar "${equipo.nombre}" del inventario? También se borrará su historial de préstamos.`}
                            >
                              <form action={accionEliminarEquipo}>
                                <input type="hidden" name="id" value={equipo.id} />
                                <Boton
                                  type="submit"
                                  variante="ghost"
                                  tamano="sm"
                                  className="text-red-700 hover:bg-red-50"
                                  aria-label={`Eliminar ${equipo.nombre}`}
                                >
                                  <Trash2 aria-hidden />
                                </Boton>
                              </form>
                            </ConfirmarEnvio>
                          </div>
                        </Td>
                      )}
                    </Fila>
                  </FilaLista>
                ))}
              </TablaCuerpo>
            </Tabla>
          )}

          <SinCoincidencias>
            <Vacio
              icono={<Search aria-hidden />}
              titulo="Sin resultados"
              descripcion="Ningún equipo coincide con lo que escribiste. Prueba con menos palabras."
            />
          </SinCoincidencias>
          <Paginador nombre="equipos" />
        </Tarjeta>

        <BarraPedido pendientes={Object.fromEntries(pendientesPorEquipo)} />
      </ProveedorLista>
    </ProveedorPedido>
  );
}

/**
 * Qué se puede decir de un equipo sin mentir.
 *
 * Antes acá había una etiqueta guardada en la columna `estado`, que sólo sabía
 * contestar "¿está afuera ahora?" cuando la pregunta del socio es siempre otra:
 * "¿está libre el fin de semana que viene?". Con la fecha de vuelta a la vista,
 * quien pide puede elegir sus fechas en vez de encontrarse una puerta cerrada.
 */
function Disponibilidad({
  enMantencion,
  compromiso,
  hoy,
}: {
  enMantencion: boolean;
  compromiso?: { desde: string; hasta: string };
  hoy: string;
}) {
  if (enMantencion) return <Insignia tono="alerta">En mantención</Insignia>;
  if (!compromiso) return <Insignia tono="exito">Disponible</Insignia>;

  // Se pasó de su fecha y nadie registró la vuelta: está afuera y no se sabe
  // hasta cuándo. Pedirlo para después es una apuesta, pero se puede.
  if (compromiso.hasta < hoy) {
    return (
      <Insignia tono="alerta">
        Sin devolver, debía volver el {formatearFecha(compromiso.hasta)}
      </Insignia>
    );
  }

  // Empezó y no ha terminado: está en manos de alguien.
  if (compromiso.desde <= hoy) {
    return (
      <Insignia tono="info">Prestado, vuelve el {formatearFecha(compromiso.hasta)}</Insignia>
    );
  }

  // Todavía no sale, pero ya tiene dueño para esas fechas.
  return (
    <Insignia tono="atencion">
      Comprometido del {formatearFecha(compromiso.desde)} al{" "}
      {formatearFecha(compromiso.hasta)}
    </Insignia>
  );
}

/**
 * Quién más tiene un pedido pendiente sobre este equipo.
 *
 * No bloquea nada: pedir lo mismo que otro está permitido y lo resuelve quien
 * lleva los equipos. Lo que esto evita es que dos personas se enteren recién
 * cuando el encargado tiene que elegir entre las dos. Con la fecha a la vista,
 * la conversación ocurre antes —o uno corre su salida un fin de semana—.
 *
 * El propio pedido se marca distinto: lo que hay que decirle a alguien que ya
 * pidió algo no es "otro lo pidió", es "ya lo pediste, no lo pidas de nuevo".
 */
function YaLoPidieron({ pedidos }: { pedidos?: PedidoPendiente[] }) {
  if (!pedidos || pedidos.length === 0) return null;

  const mio = pedidos.find((p) => p.mio);
  const ajenos = pedidos.filter((p) => !p.mio);

  return (
    <div className="mt-1 space-y-0.5">
      {/* Una insignia y no sólo una línea de texto: en una tabla de ochenta
          filas lo que se recorre con la vista son las marcas de color, y esto
          es tan parte del estado del equipo como que esté prestado. */}
      <Insignia tono="atencion">
        {ajenos.length === 0
          ? "Ya lo solicitaste"
          : pedidos.length === 1
            ? "Ya solicitado"
            : `Solicitado por ${pedidos.length}`}
      </Insignia>

      {mio && (
        <p className="text-xs text-stone-500">
          Ya lo pediste para el {formatearFecha(mio.desde)} → {formatearFecha(mio.hasta)}
        </p>
      )}

      {/* Dos y el resto contado: en una tabla, una lista de cinco nombres deja
          de leerse y empuja las demás columnas. */}
      {ajenos.slice(0, 2).map((p, i) => (
        <p key={i} className="text-xs text-amber-700">
          {p.quien} lo pidió para el {formatearFecha(p.desde)} →{" "}
          {formatearFecha(p.hasta)}
        </p>
      ))}
      {ajenos.length > 2 && (
        <p className="text-xs text-amber-700">y {ajenos.length - 2} socio(s) más.</p>
      )}
    </div>
  );
}
