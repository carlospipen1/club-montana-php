import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { CalendarDays, Users } from "lucide-react";

import { db } from "@/db";
import { reuniones } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { ETIQUETAS_TIPO_REUNION, formatearCuando } from "@/lib/reuniones";
import { BotonEnlace } from "@/components/ui/boton";
import { ESTADO_REUNION, InsigniaEstado } from "@/components/ui/datos";
import { CabeceraPagina, Tarjeta, Vacio } from "@/components/ui/superficie";

export const metadata = { title: "Reuniones" };

export default async function PaginaReuniones() {
  const usuario = await requerirUsuario();
  const gestiona = puede(usuario.rol, "gestionarReuniones");

  const lista = await db
    .select({
      id: reuniones.id,
      tipo: reuniones.tipo,
      titulo: reuniones.titulo,
      fechaHora: reuniones.fechaHora,
      lugar: reuniones.lugar,
      estado: reuniones.estado,
      convocadaEn: reuniones.convocadaEn,
      // Nombres completos de tabla: dentro de una subconsulta, interpolar las
      // columnas del esquema las deja sin calificar y la correlación se resuelve
      // mal, devolviendo un número plausible pero falso.
      asistentes: sql<number>`(select count(*)::int from asistencias where asistencias.reunion_id = reuniones.id)`,
    })
    .from(reuniones)
    .orderBy(desc(reuniones.fechaHora));

  const proximas = lista.filter((r) => r.estado === "convocada");
  const pasadas = lista.filter((r) => r.estado !== "convocada");

  function filas(items: typeof lista) {
    return (
      <ul className="divide-y divide-stone-100">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={`/panel/reuniones/${r.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-stone-50"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                <CalendarDays className="size-4" aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-900">{r.titulo}</span>
                  <InsigniaEstado mapa={ESTADO_REUNION} valor={r.estado} />
                </span>
                <span className="mt-1 block text-sm text-stone-500">
                  {ETIQUETAS_TIPO_REUNION[r.tipo]} ·{" "}
                  {r.convocadaEn
                    ? formatearCuando(r.fechaHora)
                    : new Intl.DateTimeFormat("es-CL", {
                        dateStyle: "long",
                        timeZone: "America/Santiago",
                      }).format(r.fechaHora)}
                  {r.lugar ? ` · ${r.lugar}` : ""}
                </span>
              </span>

              {r.asistentes > 0 && (
                <span className="flex shrink-0 items-center gap-1.5 text-sm text-stone-500">
                  <Users className="size-4" aria-hidden />
                  {r.asistentes}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <CabeceraPagina
        titulo="Reuniones"
        descripcion="Asambleas y reuniones de directiva del club."
      >
        {gestiona && (
          <BotonEnlace href="/panel/reuniones/nueva">Convocar reunión</BotonEnlace>
        )}
      </CabeceraPagina>

      {lista.length === 0 ? (
        <Tarjeta>
          <Vacio
            icono={<CalendarDays aria-hidden />}
            titulo="Todavía no hay reuniones"
            descripcion={
              gestiona
                ? "Convoca la primera y el club recibirá el aviso."
                : "Acá aparecerán las asambleas y reuniones cuando se convoquen."
            }
          />
        </Tarjeta>
      ) : (
        <div className="space-y-6">
          {proximas.length > 0 && (
            <Tarjeta>
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="font-semibold text-stone-900">Por venir</h2>
                <p className="text-sm text-stone-500">Reuniones convocadas.</p>
              </div>
              {filas(proximas)}
            </Tarjeta>
          )}

          {pasadas.length > 0 && (
            <Tarjeta>
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="font-semibold text-stone-900">Anteriores</h2>
                <p className="text-sm text-stone-500">
                  Reuniones ya realizadas o canceladas.
                </p>
              </div>
              {filas(pasadas)}
            </Tarjeta>
          )}
        </div>
      )}
    </>
  );
}
