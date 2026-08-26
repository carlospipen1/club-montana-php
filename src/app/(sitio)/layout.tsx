import { Cabecera, Pie } from "@/components/landing/cabecera";
import { hayAlbumesPublicados } from "@/lib/consultas-galeria";

/**
 * Envoltorio del sitio público: portada y galería comparten cabecera y pie.
 *
 * El enlace "Galería" del menú sólo aparece cuando hay algún álbum publicado,
 * para no mandar a nadie a una página vacía.
 */
export default async function LayoutSitio({ children }: LayoutProps<"/">) {
  const hayAlbumes = await hayAlbumesPublicados();

  return (
    <>
      <Cabecera hayAlbumes={hayAlbumes} />
      {children}
      <Pie />
    </>
  );
}
