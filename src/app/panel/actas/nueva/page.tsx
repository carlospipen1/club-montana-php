import { siguienteNumero } from "@/actions/actas";
import { requerirCapacidad } from "@/lib/auth";
import { CabeceraPagina, Tarjeta, TarjetaCuerpo } from "@/components/ui/superficie";
import { FormularioActa } from "../formulario";

export const metadata = { title: "Nueva acta" };

export default async function PaginaNuevaActa() {
  await requerirCapacidad("gestionarActas");

  const anio = new Date().getFullYear();
  const numero = await siguienteNumero(anio);

  return (
    <>
      <CabeceraPagina
        titulo="Nueva acta"
        descripcion={`Se propone la N°${numero} de ${anio}; puedes cambiarla si arrastras otra numeración.`}
      />

      <Tarjeta>
        <TarjetaCuerpo>
          <FormularioActa numeroSugerido={numero} anioSugerido={anio} />
        </TarjetaCuerpo>
      </Tarjeta>
    </>
  );
}
