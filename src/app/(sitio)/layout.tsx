import { Cabecera, Pie } from "@/components/landing/cabecera";
import { AvisoDemo } from "@/components/aviso-demo";
import { hayAlbumesPublicados } from "@/lib/consultas-galeria";

/**
 * El sitio público se arma en cada visita, no al compilar.
 *
 * Desde que la portada y la galería leen de la base de datos, prerenderizarlas
 * obligaba a que Neon estuviera accesible durante el build. Eso convierte
 * cualquier problema de conexión —o una variable de entorno marcada como
 * sensible, que Vercel no expone al compilar— en un despliegue fallido.
 *
 * El costo es un par de consultas por visita, todas sobre índices. A cambio, el
 * build deja de depender de la base y lo que se publica en el mantenedor
 * aparece de inmediato, sin esperar revalidación.
 *
 * Se declara en el layout para que valga también para `/galeria`.
 */
export const dynamic = "force-dynamic";

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
      <AvisoDemo />
      <Cabecera hayAlbumes={hayAlbumes} />
      {children}
      <Pie />
    </>
  );
}
