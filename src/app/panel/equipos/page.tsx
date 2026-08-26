import { asc, ilike, or } from "drizzle-orm";
import { Backpack, Search, Trash2 } from "lucide-react";

import { accionEliminarEquipo } from "@/actions/equipos";
import { db } from "@/db";
import { equipos } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { formatearFecha } from "@/lib/utils";
import { ConfirmarEnvio } from "@/components/ui/acciones";
import { Boton } from "@/components/ui/boton";
import { Input } from "@/components/ui/campos";
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
import { EditarEquipo, NuevoEquipo, SolicitarPrestamo } from "./formularios";

export const metadata = { title: "Equipos" };

export default async function PaginaEquipos({
  searchParams,
}: PageProps<"/panel/equipos">) {
  const usuario = await requerirUsuario();
  const puedeGestionar = puede(usuario.rol, "gestionarEquipos");

  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q.trim() : "";
  const patron = `%${busqueda}%`;

  const lista = await db
    .select()
    .from(equipos)
    .where(
      busqueda
        ? or(ilike(equipos.nombre, patron), ilike(equipos.categoria, patron))
        : undefined,
    )
    .orderBy(asc(equipos.categoria), asc(equipos.nombre));

  const disponibles = lista.filter((e) => e.estado === "disponible").length;

  return (
    <>
      <CabeceraPagina
        titulo="Equipos del club"
        descripcion={`${disponibles} disponible(s) de ${lista.length} en inventario.`}
      >
        {puedeGestionar && <NuevoEquipo />}
      </CabeceraPagina>

      <Tarjeta>
        <div className="border-b border-stone-200 px-5 py-3">
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
                aria-hidden
              />
              <Input
                name="q"
                defaultValue={busqueda}
                placeholder="Buscar por nombre o categoría…"
                className="pl-9"
                aria-label="Buscar equipos"
              />
            </div>
            <Boton type="submit" variante="outline">
              Buscar
            </Boton>
          </form>
        </div>

        {lista.length === 0 ? (
          <Vacio
            icono={<Backpack aria-hidden />}
            titulo={busqueda ? "Sin resultados" : "El inventario está vacío"}
            descripcion={
              busqueda
                ? `Ningún equipo coincide con "${busqueda}".`
                : "Cuando la directiva cargue el equipo del club, aparecerá acá."
            }
          />
        ) : (
          <Tabla>
            <TablaCabecera>
              <tr>
                <Th>Equipo</Th>
                <Th>Categoría</Th>
                <Th>Estado</Th>
                <Th>Adquirido</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </TablaCabecera>
            <TablaCuerpo>
              {lista.map((equipo) => (
                <Fila key={equipo.id}>
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
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {equipo.estado === "disponible" && (
                        <SolicitarPrestamo equipo={equipo} />
                      )}
                      {puedeGestionar && (
                        <>
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
                        </>
                      )}
                    </div>
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
