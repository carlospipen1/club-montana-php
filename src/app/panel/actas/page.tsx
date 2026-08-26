import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";

import { db } from "@/db";
import { actas, usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { cn, formatearFecha } from "@/lib/utils";
import { BotonEnlace } from "@/components/ui/boton";
import {
  ESTADO_ACTA,
  Insignia,
  InsigniaEstado,
  TIPO_ACTA,
} from "@/components/ui/datos";
import { CabeceraPagina, Tarjeta, Vacio } from "@/components/ui/superficie";

export const metadata = { title: "Actas" };

export default async function PaginaActas({ searchParams }: PageProps<"/panel/actas">) {
  const usuario = await requerirUsuario();
  const puedeGestionar = puede(usuario.rol, "gestionarActas");

  // Un socio corriente sólo ve lo publicado; el secretario ve también sus borradores.
  const visibles = puedeGestionar
    ? inArray(actas.estado, ["borrador", "publicada"])
    : eq(actas.estado, "publicada");

  const { anio: anioParam } = await searchParams;
  const anioFiltro = Number(anioParam);
  const filtrarAnio = Number.isInteger(anioFiltro);

  const lista = await db
    .select({
      id: actas.id,
      anio: actas.anio,
      numero: actas.numero,
      tipo: actas.tipo,
      titulo: actas.titulo,
      fecha: actas.fecha,
      lugar: actas.lugar,
      estado: actas.estado,
      redactorNombres: usuarios.nombres,
      redactorApellidos: usuarios.apellidos,
    })
    .from(actas)
    .leftJoin(usuarios, eq(actas.redactadaPor, usuarios.id))
    .where(filtrarAnio ? and(visibles, eq(actas.anio, anioFiltro)) : visibles)
    .orderBy(desc(actas.anio), desc(actas.numero));

  const anios = [...new Set(lista.map((a) => a.anio))].sort((a, b) => b - a);
  const todosLosAnios = filtrarAnio
    ? await db
        .selectDistinct({ anio: actas.anio })
        .from(actas)
        .where(visibles)
        .orderBy(desc(actas.anio))
        .then((f) => f.map((x) => x.anio))
    : anios;

  const borradores = lista.filter((a) => a.estado === "borrador").length;

  return (
    <>
      <CabeceraPagina
        titulo="Actas de reunión"
        descripcion={
          puedeGestionar
            ? `${lista.length} acta(s)${borradores > 0 ? `, ${borradores} en borrador` : ""}.`
            : "El registro de las reuniones del club."
        }
      >
        {puedeGestionar && (
          <BotonEnlace href="/panel/actas/nueva">
            <Plus aria-hidden />
            Nueva acta
          </BotonEnlace>
        )}
      </CabeceraPagina>

      {todosLosAnios.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Filtrar por año">
          <Link
            href="/panel/actas"
            aria-current={!filtrarAnio ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              !filtrarAnio
                ? "bg-brand-700 text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200 ring-inset hover:bg-stone-50",
            )}
          >
            Todas
          </Link>
          {todosLosAnios.map((a) => (
            <Link
              key={a}
              href={`/panel/actas?anio=${a}`}
              aria-current={anioFiltro === a ? "page" : undefined}
              className={cn(
                "tabular rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                anioFiltro === a
                  ? "bg-brand-700 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 ring-inset hover:bg-stone-50",
              )}
            >
              {a}
            </Link>
          ))}
        </nav>
      )}

      <Tarjeta>
        {lista.length === 0 ? (
          <Vacio
            icono={<FileText aria-hidden />}
            titulo="Todavía no hay actas"
            descripcion={
              puedeGestionar
                ? "Cuando redactes la primera reunión, aparecerá acá."
                : "Cuando la secretaría publique un acta, la verás en esta sección."
            }
          >
            {puedeGestionar && (
              <BotonEnlace href="/panel/actas/nueva" variante="outline" tamano="sm">
                <Plus aria-hidden />
                Redactar la primera
              </BotonEnlace>
            )}
          </Vacio>
        ) : (
          <ul className="divide-y divide-stone-100">
            {lista.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/panel/actas/${a.id}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-stone-50"
                >
                  <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                    <span className="text-[0.625rem] leading-none">N°</span>
                    <span className="tabular text-sm font-semibold">{a.numero}</span>
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900">{a.titulo}</p>
                      <InsigniaEstado mapa={TIPO_ACTA} valor={a.tipo} />
                      {a.estado === "borrador" && (
                        <InsigniaEstado mapa={ESTADO_ACTA} valor={a.estado} />
                      )}
                    </div>
                    <p className="text-sm text-stone-500">
                      {formatearFecha(a.fecha)}
                      {a.lugar ? ` · ${a.lugar}` : ""}
                      {a.redactorNombres
                        ? ` · Redactada por ${a.redactorNombres} ${a.redactorApellidos}`
                        : ""}
                    </p>
                  </div>

                  <Insignia className="tabular shrink-0">{a.anio}</Insignia>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}
