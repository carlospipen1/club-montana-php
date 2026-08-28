import { asc, ilike, or, sql } from "drizzle-orm";
import { Search, Users } from "lucide-react";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { ETIQUETAS_ROL, puede } from "@/lib/permisos";
import { calcularEdad, formatearFecha } from "@/lib/utils";
import { Boton } from "@/components/ui/boton";
import { Input } from "@/components/ui/campos";
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
import { accionCambiarEstadoSocio } from "@/actions/socios";
import { EditarSocio, NuevoSocio, ResetearPassword } from "./formularios";

export const metadata = { title: "Socios" };

export default async function PaginaSocios({
  searchParams,
}: PageProps<"/panel/socios">) {
  const usuario = await requerirCapacidad("verSocios");
  const puedeGestionar = puede(usuario.rol, "gestionarSocios");

  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q.trim() : "";
  const patron = `%${busqueda}%`;

  const lista = await db
    .select()
    .from(usuarios)
    .where(
      busqueda
        ? or(
            ilike(usuarios.nombres, patron),
            ilike(usuarios.apellidos, patron),
            ilike(usuarios.email, patron),
            ilike(usuarios.rut, patron),
            ilike(sql`${usuarios.nombres} || ' ' || ${usuarios.apellidos}`, patron),
          )
        : undefined,
    )
    .orderBy(asc(usuarios.apellidos), asc(usuarios.nombres));

  const activos = lista.filter((s) => s.estado === "activo").length;

  return (
    <>
      <CabeceraPagina
        titulo="Socios"
        descripcion={`${activos} activo(s) de ${lista.length} registrado(s).`}
      >
        {puedeGestionar && <NuevoSocio />}
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
                placeholder="Buscar por nombre, correo o RUT…"
                className="pl-9"
                aria-label="Buscar socios"
              />
            </div>
            <Boton type="submit" variante="outline">
              Buscar
            </Boton>
          </form>
        </div>

        {lista.length === 0 ? (
          <Vacio
            icono={<Users aria-hidden />}
            titulo={busqueda ? "Sin resultados" : "Todavía no hay socios"}
            descripcion={
              busqueda
                ? `Ningún socio coincide con "${busqueda}".`
                : "Registra al primer socio para empezar."
            }
          />
        ) : (
          <Tabla>
            <TablaCabecera>
              <tr>
                <Th>Socio</Th>
                <Th>RUT</Th>
                <Th>Edad</Th>
                <Th>Tipo</Th>
                <Th>Rol</Th>
                <Th>Ingreso</Th>
                <Th>Estado</Th>
                {puedeGestionar && <Th className="text-right">Acciones</Th>}
              </tr>
            </TablaCabecera>
            <TablaCuerpo>
              {lista.map((socio) => (
                <Fila key={socio.id}>
                  <Td>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-stone-900">
                          {socio.nombres} {socio.apellidos}
                        </p>
                        {!socio.esSocio && <Insignia>Cuenta administrativa</Insignia>}
                      </div>
                      <p className="text-xs text-stone-500">{socio.email}</p>
                    </div>
                  </Td>
                  <Td className="tabular whitespace-nowrap">{socio.rut ?? "—"}</Td>
                  <Td className="tabular whitespace-nowrap">
                    {calcularEdad(socio.fechaNacimiento) ?? "—"}
                  </Td>
                  <Td>
                    <Insignia
                      tono={socio.tipoMiembro === "estudiante" ? "info" : "neutro"}
                    >
                      {socio.tipoMiembro === "estudiante" ? "Estudiante" : "General"}
                    </Insignia>
                  </Td>
                  <Td className="whitespace-nowrap">{ETIQUETAS_ROL[socio.rol]}</Td>
                  <Td className="whitespace-nowrap">
                    {formatearFecha(socio.fechaIngreso)}
                  </Td>
                  <Td>
                    <Insignia tono={socio.estado === "activo" ? "exito" : "neutro"}>
                      {socio.estado === "activo" ? "Activo" : "Inactivo"}
                    </Insignia>
                  </Td>
                  {puedeGestionar && (
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <EditarSocio socio={socio} />
                        <ResetearPassword socio={socio} />
                        {socio.id !== usuario.id && (
                          <form action={accionCambiarEstadoSocio}>
                            <input type="hidden" name="id" value={socio.id} />
                            <input
                              type="hidden"
                              name="activar"
                              value={socio.estado === "activo" ? "0" : "1"}
                            />
                            <Boton
                              type="submit"
                              variante="ghost"
                              tamano="sm"
                              className={
                                socio.estado === "activo"
                                  ? "text-red-700 hover:bg-red-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }
                            >
                              {socio.estado === "activo" ? "Desactivar" : "Activar"}
                            </Boton>
                          </form>
                        )}
                      </div>
                    </Td>
                  )}
                </Fila>
              ))}
            </TablaCuerpo>
          </Tabla>
        )}
      </Tarjeta>
    </>
  );
}
