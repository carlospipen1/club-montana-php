import { asc, desc, eq, sql } from "drizzle-orm";
import { CalendarDays, MapPin, Mountain, Users } from "lucide-react";

import {
  accionCambiarEstadoSalida,
  accionDesinscribirse,
  accionMarcarAsistencia,
} from "@/actions/salidas";
import { db } from "@/db";
import { inscripciones, salidas, usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { formatearFechaHora } from "@/lib/utils";
import { ConfirmarEnvio } from "@/components/ui/acciones";
import { Boton } from "@/components/ui/boton";
import { Selector } from "@/components/ui/campos";
import {
  DIFICULTAD,
  ESTADO_SALIDA,
  Insignia,
  InsigniaEstado,
} from "@/components/ui/datos";
import { CabeceraPagina, Tarjeta, Vacio } from "@/components/ui/superficie";
import { EditarSalida, Inscribirse, NuevaSalida } from "./formularios";

export const metadata = { title: "Salidas" };

export default async function PaginaSalidas() {
  const usuario = await requerirUsuario();
  const puedeGestionar = puede(usuario.rol, "gestionarSalidas");
  const ahora = new Date();

  const lista = await db
    .select({
      salida: salidas,
      inscritos: sql<number>`(
        select count(*)::int from ${inscripciones}
        where ${inscripciones.salidaId} = ${salidas.id}
      )`,
      miInscripcionId: sql<number | null>`(
        select ${inscripciones.id} from ${inscripciones}
        where ${inscripciones.salidaId} = ${salidas.id}
          and ${inscripciones.usuarioId} = ${usuario.id}
        limit 1
      )`,
    })
    .from(salidas)
    .orderBy(desc(salidas.fechaSalida));

  // Los participantes se traen de una sola vez y se agrupan en memoria, en vez
  // de hacer una consulta por salida dentro del bucle de render.
  const participantes = puedeGestionar
    ? await db
        .select({
          inscripcionId: inscripciones.id,
          salidaId: inscripciones.salidaId,
          asistio: inscripciones.asistio,
          nombres: usuarios.nombres,
          apellidos: usuarios.apellidos,
          telefono: usuarios.telefono,
          contactoNombre: usuarios.contactoEmergenciaNombre,
          contactoTelefono: usuarios.contactoEmergenciaTelefono,
        })
        .from(inscripciones)
        .innerJoin(usuarios, eq(inscripciones.usuarioId, usuarios.id))
        .orderBy(asc(usuarios.apellidos))
    : [];

  const porSalida = new Map<number, typeof participantes>();
  for (const p of participantes) {
    const actual = porSalida.get(p.salidaId) ?? [];
    actual.push(p);
    porSalida.set(p.salidaId, actual);
  }

  const proximas = lista.filter((x) => x.salida.fechaSalida >= ahora);
  const pasadas = lista.filter((x) => x.salida.fechaSalida < ahora);

  function Ficha({ item }: { item: (typeof lista)[number] }) {
    const { salida, inscritos, miInscripcionId } = item;
    const inscrito = miInscripcionId !== null;
    const lleno = inscritos >= salida.cupoMaximo;
    const cerrada =
      salida.estado !== "planificada" || ahora > salida.fechaLimiteInscripcion;

    const motivoCierre =
      salida.estado === "cancelada"
        ? "Salida cancelada"
        : salida.estado !== "planificada"
          ? "Inscripciones cerradas"
          : ahora > salida.fechaLimiteInscripcion
            ? "Se cerró el plazo"
            : lleno
              ? "Sin cupos disponibles"
              : undefined;

    const lista_ = porSalida.get(salida.id) ?? [];

    return (
      <Tarjeta id={`salida-${salida.id}`} className="scroll-mt-20 overflow-hidden">
        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-stone-900">{salida.nombre}</h2>
                <InsigniaEstado mapa={DIFICULTAD} valor={salida.nivelDificultad} />
                <InsigniaEstado mapa={ESTADO_SALIDA} valor={salida.estado} />
                {inscrito && <Insignia tono="exito">Estás inscrito</Insignia>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {formatearFechaHora(salida.fechaSalida)}
                </span>
                {salida.lugar && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden />
                    {salida.lugar}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  <span className="tabular">
                    {inscritos}/{salida.cupoMaximo} inscritos
                  </span>
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {inscrito ? (
                <ConfirmarEnvio mensaje={`¿Salirte de "${salida.nombre}"?`}>
                  <form action={accionDesinscribirse}>
                    <input type="hidden" name="salidaId" value={salida.id} />
                    <Boton
                      type="submit"
                      variante="outline"
                      tamano="sm"
                      className="text-red-700"
                    >
                      Bajarme
                    </Boton>
                  </form>
                </ConfirmarEnvio>
              ) : (
                <Inscribirse
                  salidaId={salida.id}
                  nombre={salida.nombre}
                  deshabilitado={cerrada || lleno}
                  motivo={motivoCierre}
                />
              )}
              {puedeGestionar && <EditarSalida salida={salida} />}
            </div>
          </div>

          {salida.descripcion && (
            <p className="text-sm whitespace-pre-line text-stone-600">
              {salida.descripcion}
            </p>
          )}

          {salida.equipoRequerido && (
            <div className="rounded-lg bg-stone-50 px-3 py-2">
              <p className="text-xs font-medium text-stone-700">Equipo requerido</p>
              <p className="text-sm whitespace-pre-line text-stone-600">
                {salida.equipoRequerido}
              </p>
            </div>
          )}

          {!cerrada && (
            <p className="text-xs text-stone-400">
              Inscripciones hasta el {formatearFechaHora(salida.fechaLimiteInscripcion)}
            </p>
          )}
        </div>

        {puedeGestionar && (
          <div className="border-t border-stone-200 bg-stone-50/60 px-5 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <form
                action={accionCambiarEstadoSalida}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="id" value={salida.id} />
                <label
                  htmlFor={`estado-${salida.id}`}
                  className="text-xs font-medium text-stone-600"
                >
                  Estado
                </label>
                <Selector
                  id={`estado-${salida.id}`}
                  name="estado"
                  defaultValue={salida.estado}
                  className="h-8 w-auto py-0 text-xs"
                >
                  <option value="planificada">Planificada</option>
                  <option value="en_curso">En curso</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="cancelada">Cancelada</option>
                </Selector>
                <Boton type="submit" variante="outline" tamano="sm">
                  Cambiar
                </Boton>
              </form>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-stone-600 hover:text-stone-900">
                Ver participantes ({lista_.length})
              </summary>
              {lista_.length === 0 ? (
                <p className="mt-2 text-xs text-stone-500">Nadie se ha inscrito aún.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {lista_.map((p) => (
                    <li
                      key={p.inscripcionId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs ring-1 ring-stone-200"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-stone-900">
                          {p.nombres} {p.apellidos}
                        </span>
                        {p.telefono && (
                          <span className="text-stone-500"> · {p.telefono}</span>
                        )}
                        {p.contactoNombre && (
                          <span className="block text-stone-500">
                            Emergencia: {p.contactoNombre}
                            {p.contactoTelefono ? ` · ${p.contactoTelefono}` : ""}
                          </span>
                        )}
                      </div>
                      <form action={accionMarcarAsistencia}>
                        <input
                          type="hidden"
                          name="inscripcionId"
                          value={p.inscripcionId}
                        />
                        <input
                          type="hidden"
                          name="asistio"
                          value={p.asistio ? "0" : "1"}
                        />
                        <Boton
                          type="submit"
                          variante={p.asistio ? "primary" : "outline"}
                          tamano="sm"
                          className="h-7 text-xs"
                        >
                          {p.asistio ? "Asistió" : "Marcar asistencia"}
                        </Boton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </div>
        )}
      </Tarjeta>
    );
  }

  return (
    <>
      <CabeceraPagina
        titulo="Salidas"
        descripcion="Lo que viene, y el registro de lo que ya caminamos."
      >
        {puedeGestionar && <NuevaSalida />}
      </CabeceraPagina>

      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
          Próximas
        </h2>
        {proximas.length === 0 ? (
          <Tarjeta>
            <Vacio
              icono={<Mountain aria-hidden />}
              titulo="No hay salidas programadas"
              descripcion="Cuando se publique una nueva salida, aparecerá acá y recibirás una notificación."
            />
          </Tarjeta>
        ) : (
          proximas.map((item) => <Ficha key={item.salida.id} item={item} />)
        )}
      </section>

      {pasadas.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">
            Anteriores
          </h2>
          {pasadas.map((item) => (
            <Ficha key={item.salida.id} item={item} />
          ))}
        </section>
      )}
    </>
  );
}
