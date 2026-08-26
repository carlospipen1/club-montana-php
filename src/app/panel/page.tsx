import Link from "next/link";
import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { Backpack, Bell, Mountain, TriangleAlert, Wallet } from "lucide-react";

import { db } from "@/db";
import {
  cuotasMensuales,
  inscripciones,
  notificaciones,
  prestamos,
  salidas,
} from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { formatearCLP, formatearFecha, MESES, tiempoRelativo } from "@/lib/utils";
import { BotonEnlace } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/avisos";
import { DIFICULTAD, InsigniaEstado } from "@/components/ui/datos";
import {
  CabeceraPagina,
  Metrica,
  Tarjeta,
  TarjetaCabecera,
  Vacio,
} from "@/components/ui/superficie";

export const metadata = { title: "Inicio" };

export default async function PaginaPanel({ searchParams }: PageProps<"/panel">) {
  const usuario = await requerirUsuario();
  const { error } = await searchParams;
  const anio = new Date().getFullYear();

  const [proximasSalidas, misCuotas, misPrestamos, ultimasNotificaciones] =
    await Promise.all([
      db
        .select({
          id: salidas.id,
          nombre: salidas.nombre,
          lugar: salidas.lugar,
          fechaSalida: salidas.fechaSalida,
          nivelDificultad: salidas.nivelDificultad,
          cupoMaximo: salidas.cupoMaximo,
          inscritos: sql<number>`(
            select count(*)::int from ${inscripciones}
            where ${inscripciones.salidaId} = ${salidas.id}
          )`,
          yaInscrito: sql<boolean>`exists (
            select 1 from ${inscripciones}
            where ${inscripciones.salidaId} = ${salidas.id}
              and ${inscripciones.usuarioId} = ${usuario.id}
          )`,
        })
        .from(salidas)
        .where(
          and(
            gte(salidas.fechaSalida, new Date()),
            inArray(salidas.estado, ["planificada", "en_curso"]),
          ),
        )
        .orderBy(asc(salidas.fechaSalida))
        .limit(4),

      db
        .select({
          mes: cuotasMensuales.mes,
          montoEsperado: cuotasMensuales.montoEsperado,
          montoPagado: cuotasMensuales.montoPagado,
        })
        .from(cuotasMensuales)
        .where(
          and(
            eq(cuotasMensuales.usuarioId, usuario.id),
            eq(cuotasMensuales.anio, anio),
          ),
        )
        .orderBy(asc(cuotasMensuales.mes)),

      db
        .select({ total: count() })
        .from(prestamos)
        .where(
          and(
            eq(prestamos.usuarioId, usuario.id),
            inArray(prestamos.estado, ["pendiente", "aprobado"]),
          ),
        ),

      db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.usuarioId, usuario.id))
        .orderBy(desc(notificaciones.creadoEn))
        .limit(5),
    ]);

  const cuotasPendientes = misCuotas.filter((c) => c.montoPagado < c.montoEsperado);
  const deuda = cuotasPendientes.reduce(
    (acc, c) => acc + (c.montoEsperado - c.montoPagado),
    0,
  );
  const prestamosActivos = misPrestamos[0]?.total ?? 0;
  const noLeidas = ultimasNotificaciones.filter((n) => !n.leida).length;

  return (
    <>
      <CabeceraPagina
        titulo={`Hola, ${usuario.nombres}`}
        descripcion="Un resumen de lo tuyo y de lo que viene en el club."
      />

      {error === "sin-permiso" && (
        <Aviso tono="atencion" titulo="No tienes acceso a esa sección">
          Si crees que deberías tenerlo, pídeselo a la directiva.
        </Aviso>
      )}

      {usuario.debeCambiarPassword && (
        <Aviso tono="atencion" titulo="Tu contraseña es temporal">
          Entraste con la clave que te entregó la directiva.{" "}
          <Link href="/panel/perfil" className="font-medium underline">
            Cámbiala ahora
          </Link>{" "}
          por una tuya.
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          etiqueta={`Cuotas ${anio}`}
          valor={
            misCuotas.length === 0
              ? "—"
              : `${misCuotas.length - cuotasPendientes.length}/${misCuotas.length}`
          }
          detalle={
            misCuotas.length === 0
              ? "Sin período habilitado"
              : cuotasPendientes.length === 0
                ? "Estás al día"
                : `${cuotasPendientes.length} pendiente(s)`
          }
          icono={<Wallet aria-hidden />}
          tono={cuotasPendientes.length === 0 ? "positivo" : "atencion"}
        />
        <Metrica
          etiqueta="Por pagar"
          valor={formatearCLP(deuda)}
          detalle={deuda === 0 ? "Nada pendiente" : "Total adeudado del año"}
          icono={<TriangleAlert aria-hidden />}
          tono={deuda === 0 ? "positivo" : "alerta"}
        />
        <Metrica
          etiqueta="Préstamos activos"
          valor={prestamosActivos}
          detalle="Solicitados o en tu poder"
          icono={<Backpack aria-hidden />}
        />
        <Metrica
          etiqueta="Notificaciones"
          valor={noLeidas}
          detalle={noLeidas === 0 ? "Todo leído" : "Sin leer"}
          icono={<Bell aria-hidden />}
          tono={noLeidas > 0 ? "atencion" : "neutro"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-2">
          <TarjetaCabecera
            titulo="Próximas salidas"
            descripcion="Lo que viene en la cordillera"
            accion={
              <BotonEnlace href="/panel/salidas" variante="outline" tamano="sm">
                Ver todas
              </BotonEnlace>
            }
          />
          {proximasSalidas.length === 0 ? (
            <Vacio
              icono={<Mountain aria-hidden />}
              titulo="No hay salidas programadas"
              descripcion="Cuando la directiva publique una nueva salida, aparecerá acá."
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {proximasSalidas.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/panel/salidas#salida-${s.id}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-stone-50"
                  >
                    <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                      <span className="tabular text-sm leading-none font-semibold">
                        {new Date(s.fechaSalida).getDate()}
                      </span>
                      <span className="text-[0.625rem] uppercase">
                        {MESES[new Date(s.fechaSalida).getMonth()].slice(0, 3)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-stone-900">{s.nombre}</p>
                        <InsigniaEstado mapa={DIFICULTAD} valor={s.nivelDificultad} />
                        {s.yaInscrito && (
                          <span className="text-xs font-medium text-emerald-700">
                            Inscrito
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-stone-500">
                        {s.lugar ?? "Lugar por confirmar"} ·{" "}
                        {formatearFecha(s.fechaSalida)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm text-stone-500">
                      {s.inscritos}/{s.cupoMaximo}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta>
          <TarjetaCabecera
            titulo="Actividad reciente"
            accion={
              <BotonEnlace href="/panel/notificaciones" variante="outline" tamano="sm">
                Ver todo
              </BotonEnlace>
            }
          />
          {ultimasNotificaciones.length === 0 ? (
            <Vacio
              icono={<Bell aria-hidden />}
              titulo="Sin novedades"
              descripcion="Acá verás avisos de salidas, cuotas y equipos."
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {ultimasNotificaciones.map((n) => (
                <li key={n.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    {!n.leida && (
                      <span
                        className="bg-brand-600 mt-1.5 size-1.5 shrink-0 rounded-full"
                        aria-label="Sin leer"
                      />
                    )}
                    <div className={n.leida ? "pl-3.5" : ""}>
                      <p className="text-sm font-medium text-stone-900">{n.titulo}</p>
                      <p className="line-clamp-2 text-xs text-stone-500">{n.mensaje}</p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {tiempoRelativo(n.creadoEn)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {cuotasPendientes.length > 0 && (
        <Tarjeta>
          <TarjetaCabecera
            titulo={`Cuotas pendientes ${anio}`}
            descripcion={`${cuotasPendientes.length} mes(es) por regularizar`}
            accion={
              <BotonEnlace href="/panel/cuotas" variante="outline" tamano="sm">
                Ver detalle
              </BotonEnlace>
            }
          />
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {cuotasPendientes.map((c) => (
              <span
                key={c.mes}
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-900 ring-1 ring-amber-200 ring-inset"
              >
                {MESES[c.mes - 1]}{" "}
                <span className="tabular font-medium">
                  {formatearCLP(c.montoEsperado - c.montoPagado)}
                </span>
              </span>
            ))}
          </div>
        </Tarjeta>
      )}
    </>
  );
}
