import { CORREO_CLUB } from "./cabecera";
import { URL_SITIO } from "@/lib/sitio";

/**
 * Lo mismo que dice la portada, escrito para que lo lea una máquina.
 *
 * Un buscador entiende el texto, pero adivina el resto: si esto es un club o
 * una empresa, dónde queda, cómo se contacta. Declararlo en schema.org le quita
 * la adivinanza de encima y es lo que alimenta la ficha lateral que Google
 * muestra cuando alguien busca el nombre de una organización.
 *
 * No inventa nada: cada dato de acá está también a la vista en la página.
 */
export function DatosEstructurados() {
  const datos = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    name: "Club de Montaña Collipulli",
    description:
      "Club de montaña de Collipulli: senderismo, alta montaña y escalada. Salidas a la cordillera, préstamo de equipo y talleres para socios.",
    url: URL_SITIO,
    image: `${URL_SITIO}/opengraph-image`,
    email: CORREO_CLUB,
    sport: "Montañismo",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Collipulli",
      addressRegion: "La Araucanía",
      addressCountry: "CL",
    },
    areaServed: "Collipulli, La Araucanía, Chile",
    // Acá van las redes del club cuando las haya —Instagram, Facebook—. Sirven
    // para que Google entienda que esas cuentas y este sitio son la misma
    // organización, en vez de tres cosas distintas con nombre parecido.
    sameAs: [] as string[],
  };

  return (
    <script
      type="application/ld+json"
      // El contenido es un objeto propio, no entra nada escrito por nadie.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }}
    />
  );
}
