import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { db } from "@/db";
import { inscripciones, salidas, usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { formatearFecha, formatearFechaHora } from "@/lib/utils";
import { DIFICULTAD } from "@/components/ui/datos";

export const metadata = { title: "Nómina de participantes" };

/**
 * La hoja que el club deja en Carabineros antes de salir.
 *
 * Se hacía a mano cada vez, copiando nombres y RUT de una lista que el sistema
 * ya tiene. Esto la imprime: los datos que están, escritos; los que faltan, con
 * la línea en blanco para completarlos ahí mismo con un lápiz. Es más útil que
 * negarse a imprimir hasta que todos hayan llenado su ficha, porque la salida
 * es el sábado y la hoja hay que dejarla igual.
 *
 * No genera un PDF: el navegador imprime o guarda como PDF, y así no entra una
 * dependencia nueva al proyecto para algo que el navegador ya hace bien.
 */
export default async function PaginaNomina({
  params,
}: PageProps<"/panel/salidas/[id]/nomina">) {
  await requerirCapacidad("gestionarSalidas");

  const { id } = await params;
  const salidaId = Number(id);
  if (!Number.isInteger(salidaId)) notFound();

  const [salida] = await db
    .select({
      id: salidas.id,
      nombre: salidas.nombre,
      lugar: salidas.lugar,
      fechaSalida: salidas.fechaSalida,
      dificultad: salidas.nivelDificultad,
      encargadoNombres: usuarios.nombres,
      encargadoApellidos: usuarios.apellidos,
      encargadoTelefono: usuarios.telefono,
    })
    .from(salidas)
    .leftJoin(usuarios, eq(salidas.encargadoId, usuarios.id))
    .where(eq(salidas.id, salidaId))
    .limit(1);

  if (!salida) notFound();

  const participantes = await db
    .select({
      id: inscripciones.id,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
      rut: usuarios.rut,
      telefono: usuarios.telefono,
      contactoNombre: usuarios.contactoEmergenciaNombre,
      contactoTelefono: usuarios.contactoEmergenciaTelefono,
      contactoRelacion: usuarios.contactoEmergenciaRelacion,
    })
    .from(inscripciones)
    .innerJoin(usuarios, eq(inscripciones.usuarioId, usuarios.id))
    .where(eq(inscripciones.salidaId, salidaId))
    .orderBy(asc(usuarios.apellidos), asc(usuarios.nombres));

  // Filas de más para quien se suma a última hora. La lista se cierra el día
  // antes, pero la gente aparece igual en la plaza a las cinco de la mañana.
  const filasEnBlanco = 3;

  return (
    <>
      {/* Sólo en pantalla: la hoja impresa no lleva botones ni migas. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/panel/salidas"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver a salidas
        </Link>

        <p className="text-sm text-stone-500">
          Imprime con Ctrl+P, o guarda como PDF desde el mismo cuadro.
        </p>
      </div>

      <div
        id="nomina"
        className="mx-auto max-w-4xl bg-white p-8 text-stone-900 ring-1 ring-stone-200 print:max-w-none print:p-0 print:ring-0"
      >
        <header className="border-b-2 border-stone-900 pb-3">
          <p className="text-xs tracking-wide uppercase">Club de Montaña Collipulli</p>
          <h1 className="mt-1 text-xl font-bold">Nómina de participantes</h1>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="col-span-2">
            <dt className="inline font-semibold">Salida: </dt>
            <dd className="inline">{salida.nombre}</dd>
          </div>
          <div className="col-span-2">
            <dt className="inline font-semibold">Lugar: </dt>
            <dd className="inline">{salida.lugar ?? "—"}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Fecha y hora de salida: </dt>
            <dd className="inline">{formatearFechaHora(salida.fechaSalida)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Dificultad: </dt>
            <dd className="inline">{DIFICULTAD[salida.dificultad]?.texto ?? "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="inline font-semibold">Responsable de la salida: </dt>
            <dd className="inline">
              {salida.encargadoNombres
                ? `${salida.encargadoNombres} ${salida.encargadoApellidos}${
                    salida.encargadoTelefono ? ` · ${salida.encargadoTelefono}` : ""
                  }`
                : "____________________________________________"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="inline font-semibold">Regreso estimado: </dt>
            <dd className="inline">
              ______________________________________________________
            </dd>
          </div>
        </dl>

        <table className="mt-5 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-stone-100 text-left">
              <th className="w-6 border border-stone-400 px-1 py-1.5 font-semibold">
                N°
              </th>
              <th className="border border-stone-400 px-2 py-1.5 font-semibold">
                Nombre completo
              </th>
              <th className="border border-stone-400 px-2 py-1.5 font-semibold">RUT</th>
              <th className="border border-stone-400 px-2 py-1.5 font-semibold">
                Teléfono
              </th>
              <th className="border border-stone-400 px-2 py-1.5 font-semibold">
                Contacto de emergencia
              </th>
              <th className="border border-stone-400 px-2 py-1.5 font-semibold">
                Teléfono de emergencia
              </th>
            </tr>
          </thead>
          <tbody>
            {participantes.map((p, i) => (
              <tr key={p.id}>
                <td className="border border-stone-400 px-1 py-2 text-center">
                  {i + 1}
                </td>
                <td className="border border-stone-400 px-2 py-2">
                  {p.apellidos}, {p.nombres}
                </td>
                <td className="border border-stone-400 px-2 py-2">
                  <Dato valor={p.rut} />
                </td>
                <td className="border border-stone-400 px-2 py-2">
                  <Dato valor={p.telefono} />
                </td>
                <td className="border border-stone-400 px-2 py-2">
                  <Dato
                    valor={
                      p.contactoNombre
                        ? p.contactoRelacion
                          ? `${p.contactoNombre} (${p.contactoRelacion})`
                          : p.contactoNombre
                        : null
                    }
                  />
                </td>
                <td className="border border-stone-400 px-2 py-2">
                  <Dato valor={p.contactoTelefono} />
                </td>
              </tr>
            ))}

            {Array.from({ length: filasEnBlanco }, (_, i) => (
              <tr key={`libre-${i}`}>
                <td className="border border-stone-400 px-1 py-2 text-center text-stone-400">
                  {participantes.length + i + 1}
                </td>
                <td className="border border-stone-400 px-2 py-2">&nbsp;</td>
                <td className="border border-stone-400 px-2 py-2">&nbsp;</td>
                <td className="border border-stone-400 px-2 py-2">&nbsp;</td>
                <td className="border border-stone-400 px-2 py-2">&nbsp;</td>
                <td className="border border-stone-400 px-2 py-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-2 text-xs text-stone-600">
          {participantes.length === 1
            ? "1 persona inscrita"
            : `${participantes.length} personas inscritas`}{" "}
          al {formatearFecha(new Date())}. Las últimas filas quedan para quien se
          sume el mismo día.
        </p>

        <div className="mt-10 flex justify-between gap-8 text-xs">
          <div className="flex-1">
            <div className="border-t border-stone-900 pt-1">
              Firma del responsable de la salida
            </div>
          </div>
          <div className="flex-1">
            <div className="border-t border-stone-900 pt-1">
              Recibido por · fecha y hora
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-4xl text-xs text-stone-400 print:hidden">
        <Printer className="mr-1 inline size-3" aria-hidden />
        Los datos que faltan salen como línea para completar a mano.
      </p>
    </>
  );
}

/** Un dato del socio, o la línea para escribirlo a mano si no está. */
function Dato({ valor }: { valor: string | null }) {
  if (valor) return <>{valor}</>;
  return (
    <span className="block border-b border-dotted border-stone-400 text-transparent">
      .
    </span>
  );
}
