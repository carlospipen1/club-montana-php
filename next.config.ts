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
};

export default nextConfig;
