import { eq } from "drizzle-orm";

import { siguienteNumero } from "@/actions/actas";
import { db } from "@/db";
import { reuniones } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { ETIQUETAS_TIPO_REUNION, formatearCuando } from "@/lib/reuniones";
import { CabeceraPagina, Tarjeta, TarjetaCuerpo } from "@/components/ui/superficie";
import { Aviso } from "@/components/ui/avisos";
import { FormularioActa } from "../formulario";

export const metadata = { title: "Nueva acta" };

export default async function PaginaNuevaActa({
  searchParams,
}: PageProps<"/panel/actas/nueva">) {
  await requerirCapacidad("gestionarActas");

  const anio = new Date().getFullYear();
  const numero = await siguienteNumero(anio);

  // Se llega acá desde una reunión ("Redactar el acta") o directamente. En el
  // segundo caso la acción crea la reunión con los datos del acta.
  const { reunion: parametro } = await searchParams;
  const reunionId = Number(parametro);

  const [reunion] =
    Number.isInteger(reunionId) && reunionId > 0
      ? await db
          .select({
            id: reuniones.id,
            tipo: reuniones.tipo,
            titulo: reuniones.titulo,
            fechaHora: reuniones.fechaHora,
          })
          .from(reuniones)
          .where(eq(reuniones.id, reunionId))
          .limit(1)
      : [];

  return (
    <>
      <CabeceraPagina
        titulo="Nueva acta"
        descripcion={`Se propone la N°${numero} de ${anio}; puedes cambiarla si arrastras otra numeración.`}
      />

      {reunion ? (
        <Aviso tono="info" titulo="Acta de una reunión convocada">
          {ETIQUETAS_TIPO_REUNION[reunion.tipo]} · {reunion.titulo} ·{" "}
          {formatearCuando(reunion.fechaHora)}
        </Aviso>
      ) : (
        <Aviso tono="info" titulo="Sin reunión previa">
          Esta acta no viene de una reunión convocada por el sistema, así que se
          registrará una con la fecha y el lugar que escribas. Queda marcada como
          realizada.
        </Aviso>
      )}

      <Tarjeta>
        <TarjetaCuerpo>
          <FormularioActa
            numeroSugerido={numero}
            anioSugerido={anio}
            reunionId={reunion?.id}
          />
        </TarjetaCuerpo>
      </Tarjeta>
    </>
  );
}
