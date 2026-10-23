import { asc } from "drizzle-orm";
import { Users } from "lucide-react";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { ETIQUETAS_ROL, puede } from "@/lib/permisos";
import {
  BuscadorLista,
  FilaLista,
  Paginador,
  ProveedorLista,
  SinCoincidencias,
} from "@/components/panel/lista-filtrable";
import { calcularEdad, formatearFecha } from "@/lib/utils";
import { Boton } from "@/components/ui/boton";
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

export default async function PaginaSocios() {
  const usuario = await requerirCapacidad("verSocios");
  const puedeGestionar = puede(usuario.rol, "gestionarSocios");

  // El registro entero: buscar y paginar ocurren en el navegador, así que la
  // lista filtra mientras se escribe en vez de recargar con `?q=`.
  const lista = await db
    .select()
    .from(usuarios)
    .orderBy(asc(usuarios.apellidos), asc(usuarios.nombres));

  const activos = lista.filter((s) => s.estado === "activo").length;

  const buscables = lista.map((s) => ({
    id: s.id,
    texto: `${s.nombres} ${s.apellidos} ${s.email} ${s.rut ?? ""} ${ETIQUETAS_ROL[s.rol]}`,
  }));

  return (
    <>
      <CabeceraPagina
        titulo="Socios"
        descripcion={`${activos} activo(s) de ${lista.length} registrado(s).`}
      >
        {puedeGestionar && <NuevoSocio />}
      </CabeceraPagina>

      <ProveedorLista filas={buscables} porPagina={25}>
        <Tarjeta>
          <div className="border-b border-stone-200 px-5 py-3">
            <BuscadorLista marcador="Buscar por nombre, correo, RUT o rol…" />
          </div>

          {lista.length === 0 ? (
            <Vacio
              icono={<Users aria-hidden />}
              titulo="Todavía no hay socios"
              descripcion="Registra al primer socio para empezar."
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
                <FilaLista key={socio.id} id={socio.id}>
                  <Fila>
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
                </FilaLista>
              ))}
            </TablaCuerpo>
          </Tabla>
          )}

          <SinCoincidencias>
            <Vacio
              icono={<Users aria-hidden />}
              titulo="Sin resultados"
              descripcion="Ningún socio coincide con lo que escribiste."
            />
          </SinCoincidencias>

          <Paginador nombre="socios" />
        </Tarjeta>
      </ProveedorLista>
    </>
  );
}
