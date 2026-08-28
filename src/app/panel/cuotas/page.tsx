import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { Wallet } from "lucide-react";

import { accionMarcarAnioPagado } from "@/actions/cuotas";
import { db } from "@/db";
import { cuotasAnuales, cuotasMensuales, usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { cn, formatearCLP, MESES } from "@/lib/utils";
import { ConfirmarEnvio } from "@/components/ui/acciones";
import { Boton } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/datos";
import {
  CabeceraPagina,
  Metrica,
  Tarjeta,
  TarjetaCabecera,
  Vacio,
} from "@/components/ui/superficie";
import {
  CeldaCuota,
  HabilitarAnio,
  SincronizarSocios,
  type CuotaCelda,
} from "./formularios";

export const metadata = { title: "Cuotas" };

export default async function PaginaCuotas({
  searchParams,
}: PageProps<"/panel/cuotas">) {
  const usuario = await requerirUsuario();
  const puedeGestionar = puede(usuario.rol, "gestionarCuotas");

  const periodos = await db
    .select()
    .from(cuotasAnuales)
    .orderBy(desc(cuotasAnuales.anio));

  const { anio: anioParam } = await searchParams;
  const anioSolicitado = Number(anioParam);
  const anio =
    periodos.find((p) => p.anio === anioSolicitado)?.anio ??
    periodos[0]?.anio ??
    new Date().getFullYear();

  const periodo = periodos.find((p) => p.anio === anio);

  /* --- Sin ningún año habilitado ----------------------------------------- */

  if (periodos.length === 0) {
    return (
      <>
        <CabeceraPagina
          titulo="Cuotas"
          descripcion="Control de las cuotas mensuales de los socios."
        >
          {puedeGestionar && <HabilitarAnio anioSugerido={new Date().getFullYear()} />}
        </CabeceraPagina>

        <Tarjeta>
          <Vacio
            icono={<Wallet aria-hidden />}
            titulo="Todavía no hay ningún año habilitado"
            descripcion={
              puedeGestionar
                ? "Habilita un año y se generarán automáticamente las 12 cuotas de cada socio activo."
                : "La tesorería aún no abre el período de cuotas."
            }
          />
        </Tarjeta>
      </>
    );
  }

  /* --- Datos del año seleccionado ---------------------------------------- */

  const filas = await db
    .select({
      cuota: cuotasMensuales,
      socioId: usuarios.id,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
      tipoMiembro: usuarios.tipoMiembro,
      estadoSocio: usuarios.estado,
    })
    .from(cuotasMensuales)
    .innerJoin(usuarios, eq(cuotasMensuales.usuarioId, usuarios.id))
    // Las cuentas administrativas no aparecen en la tesorería: no son socios y
    // no pagan cuota. Si alguna arrastra cuotas de antes de marcarse como tal,
    // el filtro las deja fuera igual.
    .where(
      puedeGestionar
        ? and(eq(cuotasMensuales.anio, anio), eq(usuarios.esSocio, true))
        : and(
            eq(cuotasMensuales.anio, anio),
            eq(cuotasMensuales.usuarioId, usuario.id),
          ),
    )
    .orderBy(asc(usuarios.apellidos), asc(usuarios.nombres), asc(cuotasMensuales.mes));

  type Socio = {
    id: number;
    nombre: string;
    tipoMiembro: string;
    activo: boolean;
    cuotas: Map<number, CuotaCelda>;
  };

  const socios = new Map<number, Socio>();

  for (const f of filas) {
    let socio = socios.get(f.socioId);
    if (!socio) {
      socio = {
        id: f.socioId,
        nombre: `${f.apellidos}, ${f.nombres}`,
        tipoMiembro: f.tipoMiembro,
        activo: f.estadoSocio === "activo",
        cuotas: new Map(),
      };
      socios.set(f.socioId, socio);
    }
    socio.cuotas.set(f.cuota.mes, {
      id: f.cuota.id,
      mes: f.cuota.mes,
      montoEsperado: f.cuota.montoEsperado,
      montoPagado: f.cuota.montoPagado,
      estado: f.cuota.estado,
      observaciones: f.cuota.observaciones,
    });
  }

  const listaSocios = [...socios.values()];

  const totalEsperado = filas.reduce((a, f) => a + f.cuota.montoEsperado, 0);
  const totalRecaudado = filas.reduce((a, f) => a + f.cuota.montoPagado, 0);
  const alDia = listaSocios.filter((s) =>
    [...s.cuotas.values()].every((c) => c.estado === "pagado"),
  ).length;

  return (
    <>
      <CabeceraPagina
        titulo="Cuotas"
        descripcion={
          puedeGestionar
            ? `Período ${anio} · general ${formatearCLP(periodo?.montoGeneral ?? 0)}, estudiante ${formatearCLP(periodo?.montoEstudiante ?? 0)}.`
            : `Tus cuotas del año ${anio}.`
        }
      >
        {puedeGestionar && (
          <>
            <SincronizarSocios anio={anio} />
            <HabilitarAnio
              anioSugerido={Math.max(...periodos.map((p) => p.anio)) + 1}
            />
          </>
        )}
      </CabeceraPagina>

      {periodos.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Años">
          {periodos.map((p) => (
            <Link
              key={p.anio}
              href={`/panel/cuotas?anio=${p.anio}`}
              aria-current={p.anio === anio ? "page" : undefined}
              className={cn(
                "tabular rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                p.anio === anio
                  ? "bg-brand-700 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 ring-inset hover:bg-stone-50",
              )}
            >
              {p.anio}
            </Link>
          ))}
        </nav>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metrica
          etiqueta="Recaudado"
          valor={formatearCLP(totalRecaudado)}
          detalle={`de ${formatearCLP(totalEsperado)} esperados`}
          icono={<Wallet aria-hidden />}
          tono={totalRecaudado >= totalEsperado ? "positivo" : "neutro"}
        />
        <Metrica
          etiqueta="Por cobrar"
          valor={formatearCLP(totalEsperado - totalRecaudado)}
          tono={totalEsperado - totalRecaudado > 0 ? "atencion" : "positivo"}
        />
        <Metrica
          etiqueta={puedeGestionar ? "Socios al día" : "Meses pagados"}
          valor={
            puedeGestionar
              ? `${alDia}/${listaSocios.length}`
              : `${[...(listaSocios[0]?.cuotas.values() ?? [])].filter((c) => c.estado === "pagado").length}/12`
          }
        />
      </div>

      <Tarjeta>
        <TarjetaCabecera
          titulo={puedeGestionar ? `Detalle ${anio}` : `Mis cuotas ${anio}`}
          descripcion={
            puedeGestionar
              ? "Haz clic en un mes para registrar el pago."
              : "Verde: pagada. Ámbar: pago parcial. Gris: pendiente."
          }
        />

        {listaSocios.length === 0 ? (
          <Vacio
            icono={<Wallet aria-hidden />}
            titulo="Sin cuotas generadas"
            descripcion={
              puedeGestionar
                ? 'Usa "Sincronizar socios" para generar las cuotas de este año.'
                : "Aún no se te generaron cuotas para este año. Avísale a la tesorería."
            }
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="border-b border-stone-200 text-xs text-stone-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Socio
                  </th>
                  {MESES.map((m) => (
                    <th
                      key={m}
                      scope="col"
                      className="px-1 py-3 text-center font-medium"
                      title={m}
                    >
                      {m.slice(0, 3)}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Pagado
                  </th>
                  {puedeGestionar && <th scope="col" className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {listaSocios.map((socio) => {
                  const cuotas = [...socio.cuotas.values()];
                  const pagado = cuotas.reduce((a, c) => a + c.montoPagado, 0);
                  const esperado = cuotas.reduce((a, c) => a + c.montoEsperado, 0);
                  const completo = pagado >= esperado && esperado > 0;

                  return (
                    <tr key={socio.id} className="hover:bg-stone-50/70">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-900">
                            {socio.nombre}
                          </span>
                          {socio.tipoMiembro === "estudiante" && (
                            <Insignia tono="info">Est.</Insignia>
                          )}
                          {!socio.activo && <Insignia>Inactivo</Insignia>}
                        </div>
                      </td>

                      {MESES.map((_, i) => (
                        <td key={i} className="px-1 py-2">
                          <CeldaCuota
                            cuota={socio.cuotas.get(i + 1)}
                            socio={socio.nombre}
                            editable={puedeGestionar}
                          />
                        </td>
                      ))}

                      <td className="tabular px-4 py-2 text-right whitespace-nowrap">
                        <span
                          className={cn(
                            "font-medium",
                            completo ? "text-emerald-700" : "text-stone-900",
                          )}
                        >
                          {formatearCLP(pagado)}
                        </span>
                        <span className="block text-xs text-stone-400">
                          de {formatearCLP(esperado)}
                        </span>
                      </td>

                      {puedeGestionar && (
                        <td className="px-4 py-2 text-right">
                          {!completo && (
                            <ConfirmarEnvio
                              mensaje={`¿Marcar como pagadas todas las cuotas pendientes de ${socio.nombre} en ${anio}?`}
                            >
                              <form action={accionMarcarAnioPagado}>
                                <input
                                  type="hidden"
                                  name="usuarioId"
                                  value={socio.id}
                                />
                                <input type="hidden" name="anio" value={anio} />
                                <Boton
                                  type="submit"
                                  variante="ghost"
                                  tamano="sm"
                                  className="text-xs whitespace-nowrap"
                                >
                                  Saldar año
                                </Boton>
                              </form>
                            </ConfirmarEnvio>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
