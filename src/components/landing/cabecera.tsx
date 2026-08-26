import Image from "next/image";
import Link from "next/link";
import { AtSign, Lock, Mail, MapPin } from "lucide-react";

import { estiloBoton } from "@/components/ui/boton";

export const CORREO_CLUB = "cmcollipulli@gmail.com";
export const INSTAGRAM_CLUB = "https://www.instagram.com/club_montana_collipulli";

/**
 * Los enlaces del menú apuntan a `/#seccion` y no a `#seccion` a secas: así
 * funcionan igual desde la portada que desde una página de galería, donde esas
 * secciones no existen.
 */
const NAV = [
  { href: "/#somos", etiqueta: "Somos" },
  { href: "/#beneficios", etiqueta: "Beneficios" },
  { href: "/galeria", etiqueta: "Galería", requiereAlbumes: true },
  { href: "/#testimonios", etiqueta: "Experiencias" },
  { href: "/#contacto", etiqueta: "Contacto" },
];

export function Cabecera({ hayAlbumes }: { hayAlbumes: boolean }) {
  const visibles = NAV.filter((n) => !n.requiereAlbumes || hayAlbumes);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt=""
            width={112}
            height={112}
            className="size-12 object-contain sm:size-14"
            priority
          />
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-stone-900">
              Club de Montaña Collipulli
            </span>
            <span className="block text-xs text-stone-500">Región de La Araucanía</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {visibles.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-stone-600 transition-colors hover:text-stone-900"
            >
              {n.etiqueta}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className={`${estiloBoton("outline", "sm")} ml-auto md:ml-0`}
        >
          <Lock aria-hidden />
          <span className="hidden sm:inline">Acceso socios</span>
          <span className="sm:hidden">Entrar</span>
        </Link>
      </div>
    </header>
  );
}

export function Pie() {
  return (
    <footer id="contacto" className="bg-brand-950 text-brand-100 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="space-y-3">
            <p className="text-lg font-semibold text-white">
              Club de Montaña Collipulli
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${CORREO_CLUB}`}
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <Mail className="size-4" aria-hidden />
                  {CORREO_CLUB}
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_CLUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <AtSign className="size-4" aria-hidden />
                  @club_montana_collipulli
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className="size-4" aria-hidden />
                Collipulli, Región de La Araucanía
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Socios</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm hover:text-white"
            >
              <Lock className="size-4" aria-hidden />
              Entrar a la intranet
            </Link>
          </div>
        </div>

        <p className="text-brand-200/70 mt-12 border-t border-white/10 pt-6 text-center text-xs">
          © {new Date().getFullYear()} Club de Montaña Collipulli · Difundiendo la
          montaña
        </p>
      </div>
    </footer>
  );
}
