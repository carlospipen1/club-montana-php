import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { actas } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { Aviso } from "@/components/ui/avisos";
import { CabeceraPagina, Tarjeta, TarjetaCuerpo } from "@/components/ui/superficie";
import { FormularioActa } from "../../formulario";

export const metadata = { title: "Editar acta" };

export default async function PaginaEditarActa({
  params,
}: PageProps<"/panel/actas/[id]/editar">) {
  await requerirCapacidad("gestionarActas");

  const { id } = await params;
  const actaId = Number(id);
  if (!Number.isInteger(actaId)) notFound();

  const [acta] = await db.select().from(actas).where(eq(actas.id, actaId)).limit(1);
  if (!acta) notFound();

  return (
    <>
      <CabeceraPagina
        titulo={`Editar acta N°${acta.numero} · ${acta.anio}`}
        descripcion={acta.titulo}
      />

      {acta.estado === "publicada" && (
        <Aviso tono="atencion" titulo="Esta acta ya está publicada">
          Los socios la están viendo. Los cambios que guardes quedan visibles de
          inmediato. Si necesitas rehacerla, vuélvela a borrador primero.
        </Aviso>
      )}

      <Tarjeta>
        <TarjetaCuerpo>
          <FormularioActa acta={acta} />
        </TarjetaCuerpo>
      </Tarjeta>
    </>
  );
}
