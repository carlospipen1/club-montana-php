import { requerirCapacidad } from "@/lib/auth";
import { CabeceraPagina, Tarjeta } from "@/components/ui/superficie";
import { FormularioReunion } from "../formulario";

export const metadata = { title: "Convocar reunión" };

export default async function PaginaNuevaReunion() {
  await requerirCapacidad("gestionarReuniones");

  return (
    <>
      <CabeceraPagina
        titulo="Convocar reunión"
        descripcion="Al guardar, todos los socios reciben el aviso en su panel. Después podrás copiar el texto para mandarlo por WhatsApp."
      />

      <Tarjeta>
        <div className="p-5 sm:p-6">
          <FormularioReunion />
        </div>
      </Tarjeta>
    </>
  );
}
