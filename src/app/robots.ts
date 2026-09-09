import type { MetadataRoute } from "next";

import { URL_SITIO } from "@/lib/sitio";

/**
 * Qué puede recorrer un buscador.
 *
 * Sin este archivo el sitio no tenía `robots.txt` —daba 404— y tampoco había
 * sitemap que ofrecerle a Google.
 *
 * Lo importante está en la demostración: sirve el mismo sitio público con el
 * mismo contenido en otro dominio. Si Google la indexa, compite consigo misma y
 * el buscador tiene que elegir cuál de las dos mostrar, que es la peor forma de
 * perder la primera posición del nombre del club. Por eso la demostración se
 * declara entera fuera de índice.
 */
/**
 * Se arma en cada visita, no al compilar.
 *
 * `MODO_DEMO` está marcada como sensible en Vercel, y esas variables no existen
 * durante el build (ver el `CLAUDE.md`). Si este archivo se generara al
 * compilar, la demostración leería la bandera vacía y publicaría un `robots.txt`
 * que invita a Google a indexarla: justo lo contrario de lo que hace falta.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Se lee la variable directo y no desde `lib/demo.ts` porque ese archivo es
  // `server-only` y acá no hace falta nada más que la bandera.
  const esDemo = process.env.MODO_DEMO === "1";

  if (esDemo) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // La intranet no tiene nada que hacer en un buscador. El proxy ya
        // manda al login a quien no tenga sesión, pero mejor ni pedirla.
        disallow: ["/panel/", "/login", "/recuperar"],
      },
    ],
    sitemap: `${URL_SITIO}/sitemap.xml`,
    host: URL_SITIO,
  };
}
