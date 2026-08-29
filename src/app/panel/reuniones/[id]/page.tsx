import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { CalendarDays, FileText, MapPin } from "lucide-react";

import { accionCambiarEstadoReunion } from "@/actions/reuniones";
import { db } from "@/db";
import { actas, asistencias, reuniones, usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import {
  ETIQUETAS_TIPO_REUNION,
  formatearCuando,
  textoConvocatoria,
} from "@/lib/reuniones";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { ESTADO_REUNION, InsigniaEstado } from "@/components/ui/datos";
import { CabeceraPagina, Tarjeta } from "@/components/ui/superficie";
import { Asistencia } from "../asistencia";
import { CopiarConvocatoria } from "../copiar-convocatoria";

export default async function PaginaReunion({
  params,
}: PageProps<"/panel/reuniones/[id]">) {
  const usuario = await requerirUsuario();
  const gestiona = puede(usuario.rol, "gestionarReuniones");

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [reunion] = await db
    .select()
    .from(reuniones)
    .where(eq(reuniones.id, id))
    .limit(1);

  if (!reunion) notFound();

  const [acta] = await db
    .select({ id: actas.id, numero: actas.numero, anio: actas.anio })
    .from(actas)
    .where(eq(actas.reunionId, id))
    .limit(1);

  // Sólo socios: las cuentas administrativas no son personas del club y no
  // corresponde que figuren en una lista de asistencia.
  const socios = await db
    .select({
      id: usuarios.id,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(usuarios)
    .where(and(eq(usuarios.estado, "activo"), eq(usuarios.esSocio, true)))
    .orderBy(asc(usuarios.apellidos), asc(usuarios.nombres));

  const presentes = await db
    .select({ usuarioId: asistencias.usuarioId })
    .from(asistencias)
    .where(eq(asistencias.reunionId, id));

  const idsPresentes = new Set(presentes.map((p) => p.usuarioId));

  const cuando = reunion.convocadaEn
    ? formatearCuando(reunion.fechaHora)
    : new Intl.DateTimeFormat("es-CL", {
        dateStyle: "long",
        timeZone: "America/Santiago",
      }).format(reunion.fechaHora);

  return (
    <>
      <CabeceraPagina
        titulo={reunion.titulo}
        descripcion={ETIQUETAS_TIPO_REUNION[reunion.tipo]}
      >
        {gestiona && reunion.estado === "convocada" && (
          <div className="flex flex-wrap gap-2">
            <form action={accionCambiarEstadoReunion}>
              <input type="hidden" name="id" value={reunion.id} />
              <input type="hidden" name="estado" value="realizada" />
              <Boton type="submit" variante="outline">
                Marcar realizada
              </Boton>
            </form>
            <form action={accionCambiarEstadoReunion}>
              <input type="hidden" name="id" value={reunion.id} />
              <input type="hidden" name="estado" value="cancelada" />
              <Boton type="submit" variante="dangerOutline">
                Cancelar
              </Boton>
            </form>
          </div>
        )}
      </CabeceraPagina>

      <Tarjeta>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <InsigniaEstado mapa={ESTADO_REUNION} valor={reunion.estado} />
            {!reunion.convocadaEn && (
              <span className="text-xs text-stone-500">
                Registrada después de ocurrida, sin convocatoria previa.
              </span>
            )}
          </div>

          <p className="flex items-center gap-2 text-stone-700">
            <CalendarDays className="size-4 text-stone-400" aria-hidden />
            {cuando}
          </p>

          {reunion.lugar && (
            <p className="flex items-center gap-2 text-stone-700">
              <MapPin className="size-4 text-stone-400" aria-hidden />
              {reunion.lugar}
            </p>
          )}

          {reunion.tabla && (
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Tabla</h2>
              <p className="mt-1 whitespace-pre-wrap text-stone-700">{reunion.tabla}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4">
            {acta ? (
              <Link
                href={`/panel/actas/${acta.id}`}
                className="text-brand-700 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
              >
                <FileText className="size-4" aria-hidden />
                Ver el acta N°{acta.numero} de {acta.anio}
              </Link>
            ) : (
              puede(usuario.rol, "gestionarActas") && (
                <BotonEnlace
                  href={`/panel/actas/nueva?reunion=${reunion.id}`}
                  variante="outline"
                  tamano="sm"
                >
                  Redactar el acta
                </BotonEnlace>
              )
            )}
          </div>
        </div>
      </Tarjeta>

      {gestiona && (
        <Tarjeta>
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-900">Convocatoria</h2>
            <p className="text-sm text-stone-500">
              El sistema ya avisó dentro del panel. Este texto es para pegarlo en el
              grupo de WhatsApp, que es por donde el club se entera.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <CopiarConvocatoria texto={textoConvocatoria(reunion)} />
          </div>
        </Tarjeta>
      )}

      {gestiona && (
        <Tarjeta>
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-semibold text-stone-900">Asistencia</h2>
            <p className="text-sm text-stone-500">
              Se marca después de la reunión, al redactar el acta.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <Asistencia
              reunionId={reunion.id}
              socios={socios.map((s) => ({
                id: s.id,
                nombre: `${s.apellidos}, ${s.nombres}`,
                presente: idsPresentes.has(s.id),
              }))}
            />
          </div>
        </Tarjeta>
      )}
    </>
  );
}
