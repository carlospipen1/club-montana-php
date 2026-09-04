import { ImageResponse } from "next/og";

import { URL_SITIO } from "@/lib/sitio";

/**
 * Imagen de la vista previa al compartir el sitio.
 *
 * Next la descubre por el nombre del archivo y agrega el `og:image` solo. Se
 * dibuja acá en vez de subir un JPG porque así el texto no se desalinea al
 * cambiarlo y no hay que abrir un editor para corregir una tilde.
 *
 * Repite el encabezado del sitio a propósito —el mismo azul, la misma silueta,
 * la misma frase—: quien ve la tarjeta en WhatsApp y después entra tiene que
 * reconocer que llegó al lugar correcto.
 */
export const alt = "Club de Montaña Collipulli";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const AZUL = "#1a436e";
const AZUL_OSCURO = "#0f1f33";

export default async function Imagen() {
  // Sin el protocolo: en una tarjeta el "https://" no aporta nada.
  const dominio = URL_SITIO.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          padding: "0 80px",
          background: `linear-gradient(135deg, ${AZUL} 0%, ${AZUL_OSCURO} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* La cordillera del encabezado, apoyada en el borde inferior. */}
        <svg
          width="1200"
          height="340"
          viewBox="0 0 1200 300"
          fill="none"
          style={{ position: "absolute", bottom: 0, left: 0 }}
        >
          <path
            fill="#ffffff"
            opacity="0.12"
            d="M0 300V230l150-80 120 70 140-95 130 105 120-65 150 100 130-80 160 115v0z"
          />
        </svg>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            color: "#ffffff",
            opacity: 0.85,
            fontSize: 28,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="#ffffff">
            <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
          </svg>
          Comunidad de montaña · Collipulli
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 82,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          Club de Montaña Collipulli
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 34,
            color: "#ffffff",
            opacity: 0.9,
            maxWidth: 900,
          }}
        >
          Difundimos y practicamos el montañismo: senderismo, alta montaña y escalada.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 28,
            color: "#ffffff",
            opacity: 0.7,
          }}
        >
          {dominio}
        </div>
      </div>
    ),
    size,
  );
}
