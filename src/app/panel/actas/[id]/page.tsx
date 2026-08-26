import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Pencil,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";

import {
  accionEliminarActa,
  accionPublicarActa,
  accionVolverABorrador,
} from "@/actions/actas";
import { db } from "@/db";
import { actas, usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { formatearFecha, formatearFechaHora } from "@/lib/utils";
import { ConfirmarEnvio } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { ESTADO_ACTA, InsigniaEstado, TIPO_ACTA } from "@/components/ui/datos";
import { Tarjeta } from "@/components/ui/superficie";

export async function generateMetadata({ params }: PageProps<"/panel/actas/[id]">) {
  const { id } = await params;
  const [acta] = await db
    .select({ numero: actas.numero, anio: actas.anio })
    .from(actas)
    .where(eq(actas.id, Number(id)))
    .limit(1);

  return { title: acta ? `Acta N°${acta.numero} · ${acta.anio}` : "Acta" };
}

export default async function PaginaActa({ params }: PageProps<"/panel/actas/[id]">) {
  const usuario = await requerirUsuario();
  const puedeGestionar = puede(usuario.rol, "gestionarActas");

  const { id } = await params;
  const actaId = Number(id);
  if (!Number.isInteger(actaId)) notFound();

  const [fila] = await db
    .select({
      acta: actas,
      redactorNombres: usuarios.nombres,
      redactorApellidos: usuarios.apellidos,
    })
    .from(actas)
    .leftJoin(usuarios, eq(actas.redactadaPor, usuarios.id))
    .where(eq(actas.id, actaId))
    .limit(1);

  if (!fila) notFound();
  const { acta } = fila;

  // Un borrador es material de trabajo de la secretaría: para el resto del club
  // simplemente no existe todavía.
  if (acta.estado === "borrador" && !puedeGestionar) notFound();

  return (
    <>
      <Link
        href="/panel/actas"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Todas las actas
      </Link>

      {acta.estado === "borrador" && (
        <Aviso tono="atencion" titulo="Borrador">
          Sólo tú y el administrador ven esta acta. Publícala para que quede disponible
          para el club.
        </Aviso>
      )}

      <Tarjeta>
        <header className="space-y-3 border-b border-stone-200 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular rounded-md bg-stone-900 px-2 py-0.5 text-xs font-semibold text-white">
              Acta N°{acta.numero} · {acta.anio}
            </span>
            <InsigniaEstado mapa={TIPO_ACTA} valor={acta.tipo} />
            <InsigniaEstado mapa={ESTADO_ACTA} valor={acta.estado} />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-balance text-stone-900">
            {acta.titulo}
          </h1>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatearFecha(acta.fecha)}
            </span>
            {acta.lugar && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                {acta.lugar}
              </span>
            )}
            {fila.redactorNombres && (
              <span>
                Redactada por {fila.redactorNombres} {fila.redactorApellidos}
              </span>
            )}
          </div>
        </header>

        {/* El cuerpo es texto plano: se conservan los saltos de línea tal como se
            escribieron, y se muestra en una columna angosta para que se lea. */}
        <div className="px-6 py-6">
          <div className="max-w-prose text-[0.9375rem] leading-relaxed whitespace-pre-line text-stone-800">
            {acta.cuerpo}
          </div>
        </div>

        <footer className="border-t border-stone-200 px-6 py-3 text-xs text-stone-400">
          {acta.publicadaEn && (
            <>Publicada el {formatearFechaHora(acta.publicadaEn)}. </>
          )}
          Última modificación: {formatearFechaHora(acta.actualizadoEn)}.
        </footer>
      </Tarjeta>

      {puedeGestionar && (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/panel/actas/${acta.id}/editar`}>
            <Boton variante="outline">
              <Pencil aria-hidden />
              Editar
            </Boton>
          </Link>

          {acta.estado === "borrador" ? (
            <ConfirmarEnvio
              mensaje={`¿Publicar el acta N°${acta.numero}? Quedará visible para todos los socios${acta.publicadaEn ? "" : " y se les enviará una notificación"}.`}
            >
              <form action={accionPublicarActa}>
                <input type="hidden" name="id" value={acta.id} />
                <Boton type="submit">
                  <Send aria-hidden />
                  Publicar
                </Boton>
              </form>
            </ConfirmarEnvio>
          ) : (
            <ConfirmarEnvio mensaje="¿Volver a borrador? Dejará de estar visible para los socios.">
              <form action={accionVolverABorrador}>
                <input type="hidden" name="id" value={acta.id} />
                <Boton type="submit" variante="outline">
                  <Undo2 aria-hidden />
                  Volver a borrador
                </Boton>
              </form>
            </ConfirmarEnvio>
          )}

          {acta.estado === "borrador" && (
            <ConfirmarEnvio mensaje="¿Eliminar este borrador? No se puede deshacer.">
              <form action={accionEliminarActa} className="ml-auto">
                <input type="hidden" name="id" value={acta.id} />
                <Boton type="submit" variante="dangerOutline">
                  <Trash2 aria-hidden />
                  Eliminar borrador
                </Boton>
              </form>
            </ConfirmarEnvio>
          )}
        </div>
      )}
    </>
  );
}
