import { asc, eq } from "drizzle-orm";
import { Backpack, Search, Trash2 } from "lucide-react";

import { accionEliminarEquipo } from "@/actions/equipos";
import { db } from "@/db";
import { equipos, prestamos, solicitudesPrestamo } from "@/db/schema";
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
import { BarraPedido, CasillaEquipo, ProveedorPedido } from "./pedido";
import {
  BuscadorEquipos,
  FilaFiltrable,
  ProveedorFiltro,
  SinCoincidencias,
} from "./filtro";

export const metadata = { title: "Equipos" };

export default async function PaginaEquipos() {
  const usuario = await requerirUsuario();
  const puedeGestionar = puede(usuario.rol, "gestionarEquipos");

  // El inventario entero, sin filtrar en la consulta: la búsqueda ocurre en el
  // navegador (ver `filtro.tsx`), porque recargar la página para buscar borraba
  // lo que la persona llevaba marcado.
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
      <ProveedorFiltro filas={buscables}>
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
            <BuscadorEquipos />
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
                  <FilaFiltrable key={equipo.id} id={equipo.id}>
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
                  </FilaFiltrable>
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
        </Tarjeta>

        <BarraPedido />
      </ProveedorFiltro>
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
