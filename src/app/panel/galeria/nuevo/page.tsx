import { requerirCapacidad } from "@/lib/auth";
import { CabeceraPagina, Tarjeta, TarjetaCuerpo } from "@/components/ui/superficie";
import { FormularioAlbum } from "../formulario";

export const metadata = { title: "Nuevo álbum" };

export default async function PaginaNuevoAlbum() {
  await requerirCapacidad("gestionarGaleria");

  return (
    <>
      <CabeceraPagina
        titulo="Nuevo álbum"
        descripcion="Primero los datos de la salida; en la pantalla siguiente subes las fotos."
      />

      <Tarjeta>
        <TarjetaCuerpo>
          <FormularioAlbum />
        </TarjetaCuerpo>
      </Tarjeta>
    </>
  );
}
