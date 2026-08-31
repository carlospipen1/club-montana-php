import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { URL_SITIO } from "@/lib/sitio";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: {
    default: "Club de Montaña Collipulli",
    template: "%s · Club de Montaña Collipulli",
  },
  description:
    "Club de montaña de Collipulli: salidas a la cordillera, préstamo de equipo y comunidad para quienes recién parten y para quienes llevan años caminando.",
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "Club de Montaña Collipulli",
    title: "Club de Montaña Collipulli",
    description:
      "Salidas a la cordillera, préstamo de equipo y comunidad montañista en Collipulli.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
