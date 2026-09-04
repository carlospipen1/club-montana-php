import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las fotos de la galería se sirven desde Vercel Blob, en un subdominio que
    // depende del store. next/image sólo optimiza dominios declarados aquí.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },

  /**
   * `www` y el dominio pelado servían los dos el sitio completo, con 200 en
   * ambos: para un buscador son dos sitios con el mismo contenido, y para una
   * cookie de sesión son dos orígenes distintos. Se elige el pelado, que es el
   * que está en `NEXT_PUBLIC_SITE_URL` y el que sale en los correos.
   *
   * El anfitrión se captura con un grupo con nombre para que sirva a cualquier
   * dominio —el del club hoy, el que venga mañana— sin escribirlo acá.
   */
  async redirects() {
    return [
      {
        source: "/:ruta*",
        has: [{ type: "host", value: "www\.(?<anfitrion>.*)" }],
        destination: "https://:anfitrion/:ruta*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
