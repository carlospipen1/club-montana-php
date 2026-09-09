import type { MetadataRoute } from "next";

import { albumesPublicados } from "@/lib/consultas-galeria";
import { URL_SITIO } from "@/lib/sitio";

/**
 * El mapa que se le entrega a Google.
 *
 * Son pocas direcciones —la portada y cada álbum publicado—, pero sirve para
 * dos cosas: que el buscador se entere de que existen sin tener que descubrirlas
 * navegando, y que sepa cuándo cambió cada una. Un álbum nuevo de una salida es
 * exactamente la clase de página que conviene que aparezca.
 *
 * Como el sitio público es dinámico a propósito (ver el `CLAUDE.md`), esto se
 * genera en cada visita del buscador y no al compilar, así que no obliga a que
 * la base responda durante el despliegue.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const albumes = await albumesPublicados();

  return [
    {
      url: `${URL_SITIO}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...albumes.map((album) => ({
      url: `${URL_SITIO}/galeria/${album.id}`,
      // La fecha de la salida es lo más cercano a "cuándo cambió esto" que
      // tenemos: un álbum se publica una vez y no se vuelve a tocar.
      lastModified: album.fecha ? new Date(album.fecha) : new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
