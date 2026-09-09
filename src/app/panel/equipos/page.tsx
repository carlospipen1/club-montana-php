import { asc } from "drizzle-orm";
import { Backpack, Search, Trash2 } from "lucide-react";

import { accionEliminarEquipo } from "@/actions/equipos";
import { db } from "@/db";
import { equipos } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { formatearFecha } from "@/lib/utils";
import { ConfirmarEnvio } from "@/components/ui/acciones";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import {
  ESTADO_EQUIPO,
  Fila,
  InsigniaEstado,
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

  const disponibles = lista.filter((e) => e.estado === "disponible").length;

  const buscables = lista.map((e) => ({
    id: e.id,
    texto: `${e.nombre} ${e.categoria} ${e.descripcion ?? ""}`,
  }));

  return (
    <ProveedorPedido>
      <ProveedorFiltro filas={buscables}>
        <CabeceraPagina
          titulo="Equipos del club"
          descripcion={`${disponibles} disponible(s) de ${lista.length} en inventario. Marca lo que necesites y pídelo todo junto.`}
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
                        {/* Sólo lo disponible se puede marcar: lo prestado y lo que
                            está en mantención se ve, pero no se pide. */}
                        <CasillaEquipo
                          id={equipo.id}
                          nombre={equipo.nombre}
                          deshabilitada={equipo.estado !== "disponible"}
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
                      <Td>
                        <InsigniaEstado mapa={ESTADO_EQUIPO} valor={equipo.estado} />
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
