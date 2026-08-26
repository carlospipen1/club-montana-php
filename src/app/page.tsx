import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  BookOpen,
  Lock,
  Mail,
  MapPin,
  ScrollText,
  Tag,
} from "lucide-react";

import { Carrusel } from "@/components/landing/carrusel";
import { estiloBoton } from "@/components/ui/boton";
import { leerGaleria } from "@/lib/galeria";
import { cn } from "@/lib/utils";

const BENEFICIOS = [
  {
    Icono: ScrollText,
    titulo: "Derechos y deberes",
    texto:
      "Ser socio no es sólo pagar la cuota. Se espera que participes: en las asambleas, donde se decide el rumbo del club; en las salidas a terreno; y en los talleres, teóricos y prácticos, donde se aprende y también se enseña. A cambio tienes voz y voto, y el equipo del club a tu disposición.",
  },
  {
    Icono: Tag,
    titulo: "Convenios y beneficios",
    texto:
      "Descuentos en tiendas de montaña y cursos a precio de socio. Y sobre todo, acceso al equipo técnico del club —carpas, sacos, cuerdas, crampones— sin tener que comprarlo: es lo que permite empezar en la montaña sin gastar un sueldo en implementación.",
  },
  {
    Icono: BookOpen,
    titulo: "Archivo Montaña",
    texto:
      "Cada salida deja algo: rutas, fotos, tiempos reales, y el relato honesto de lo que resultó y de lo que no. Ese archivo es la memoria del club, y es lo que permite que quien salga el próximo verano no repita los errores del anterior.",
  },
];

const TESTIMONIOS = [
  {
    texto:
      "He logrado cumbres que jamás pensé que podría subir. Encantado de participar con un gran equipo de compañeros.",
    nombre: "Rodrigo Sanhueza",
    detalle: "Socio desde 2019",
  },
  {
    texto:
      "En los cursos y talleres me han enseñado nuevas técnicas y el uso adecuado de los implementos deportivos.",
    nombre: "Camila Martínez",
    detalle: "Socia desde 2021",
  },
  {
    texto:
      "El compañerismo nos ayuda a trabajar con seguridad, haciendo del montañismo una opción de vida.",
    nombre: "Fernando Antilef",
    detalle: "Socio fundador",
  },
];

const NAV = [
  { href: "#somos", etiqueta: "Somos" },
  { href: "#beneficios", etiqueta: "Beneficios" },
  // La galería sólo existe si hay fotos cargadas; el enlace se filtra abajo.
  { href: "#galeria", etiqueta: "Galería", requiereFotos: true },
  { href: "#testimonios", etiqueta: "Experiencias" },
  { href: "#contacto", etiqueta: "Contacto" },
];

function Iniciales({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <span
      aria-hidden
      className="bg-brand-100 text-brand-800 flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
    >
      {iniciales}
    </span>
  );
}

export default function PaginaInicio() {
  const fotos = leerGaleria();
  const navegacion = NAV.filter((n) => !n.requiereFotos || fotos.length > 0);
  // La primera de la galería (por eso el prefijo 01-) hace de fondo del hero.
  const portada = fotos[0];

  return (
    <>
      {/* ------------------------------ Cabecera ----------------------------- */}

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
              <span className="block text-xs text-stone-500">
                Región de La Araucanía
              </span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-7 md:flex">
            {navegacion.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm text-stone-600 transition-colors hover:text-stone-900"
              >
                {n.etiqueta}
              </a>
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

      <main className="flex-1">
        {/* -------------------------------- Hero ----------------------------- */}

        <section className="bg-brand-950 relative overflow-hidden">
          {portada ? (
            <>
              {/* La primera foto de la galería hace de fondo. Es la imagen más
                  pesada de la página: se carga con prioridad para que no aparezca
                  un rectángulo vacío mientras baja. */}
              <Image
                src={portada.src}
                alt=""
                fill
                sizes="100vw"
                priority
                className="object-cover"
              />
              {/* Doble capa: un velo parejo que apaga la foto y un degradado que
                  oscurece más arriba y abajo, donde va el texto. Sin esto, el
                  blanco sobre una foto clara queda ilegible. */}
              <div className="absolute inset-0 bg-stone-950/55" aria-hidden />
              <div
                className="absolute inset-0 bg-linear-to-b from-stone-950/70 via-transparent to-stone-950/80"
                aria-hidden
              />
            </>
          ) : (
            /* Sin fotos, se dibuja la cordillera: la portada nunca queda vacía. */
            <svg
              className="text-brand-900/60 absolute inset-x-0 bottom-0 h-56 w-full sm:h-72"
              viewBox="0 0 1200 300"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M0 300V180l120-70 90 55 110-105 130 120 95-60 125 95 100-75 135 110 95-45 100 75v20z"
              />
              <path
                fill="currentColor"
                opacity="0.6"
                d="M0 300V230l150-80 120 70 140-95 130 105 120-65 150 100 130-80 160 115v0z"
              />
            </svg>
          )}

          {/* El escudo va arriba a la derecha, sobre el cielo: centrado tapaba
              las caras de quienes salen en la foto. */}
          <Image
            src="/logo.png"
            alt="Escudo del Club de Montaña Collipulli"
            width={320}
            height={320}
            className="absolute top-5 right-4 z-10 size-20 object-contain drop-shadow-xl sm:top-8 sm:right-8 sm:size-28 lg:size-32"
            priority
          />

          <div className="relative mx-auto max-w-3xl px-4 py-28 text-center sm:px-6 sm:py-36">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm ring-inset">
              Comunidad de montaña
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
              Club de Montaña Collipulli
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-white/90">
              Difundimos y practicamos el montañismo: senderismo, alta montaña y
              escalada.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#somos" className={estiloBoton("secondary", "lg")}>
                Conócenos
                <ArrowRight aria-hidden />
              </a>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/25 px-6 text-base font-medium text-white transition-colors hover:bg-white/10 [&_svg]:size-4"
              >
                <Lock aria-hidden />
                Intranet de socios
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------ Galería ---------------------------- */}

        {/* Va inmediatamente después del hero, antes de cualquier texto: las
            fotos de la cordillera son lo que convence a alguien de acercarse al
            club. Fondo oscuro para que continúe visualmente el hero y las fotos
            resalten. */}
        {fotos.length > 0 && (
          <section id="galeria" className="scroll-mt-16 bg-stone-950">
            <div className="py-16 sm:py-20">
              <div className="mx-auto mb-8 max-w-6xl px-4 sm:px-6">
                <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
                  Galería
                </h2>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                  La cordillera, por nuestros ojos
                </p>
                <p className="mt-3 max-w-xl text-pretty text-white/70">
                  Fotografías de nuestras salidas. Arrastra para recorrerlas.
                </p>
              </div>

              {/* De borde a borde: el carrusel no se encajona en la columna de
                  texto, para que las fotos ocupen todo el ancho disponible. */}
              <Carrusel fotos={fotos} />
            </div>
          </section>
        )}

        {/* -------------------------------- Somos ---------------------------- */}

        <section id="somos" className="scroll-mt-16 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-brand-700 text-sm font-medium tracking-wide uppercase">
              Somos
            </h2>
            <p className="mt-4 text-xl leading-relaxed text-pretty text-stone-700">
              El Club de Montaña Collipulli es una organización deportiva{" "}
              <strong className="font-semibold text-stone-900">
                sin fines de lucro
              </strong>{" "}
              que difunde y promueve el montañismo en sus distintas áreas: senderismo,
              media y alta montaña, y escalada.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-stone-600">
              Caminamos la cordillera de La Araucanía. Los faldeos del Tolhuaca, las
              araucarias de la Reserva Malleco, el Lonquimay cuando el tiempo acompaña.
              Territorio mapuche, bosque nativo y volcanes que se ven desde el pueblo
              cualquier mañana despejada.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-stone-600">
              Nos mueve la seguridad antes que la cumbre y el compañerismo antes que el
              récord. Aquí no hay guías ni clientes: hay socios que se enseñan entre
              ellos, y una cordillera a la que se entra con cuidado y de la que se sale
              sin dejar rastro.
            </p>
          </div>
        </section>

        {/* ----------------------------- Beneficios -------------------------- */}

        <section
          id="beneficios"
          className="scroll-mt-16 border-y border-stone-200 bg-stone-50"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-brand-700 text-sm font-medium tracking-wide uppercase">
                Beneficios
              </h2>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-900">
                Lo que debes saber antes
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {BENEFICIOS.map(({ Icono, titulo, texto }) => (
                <div
                  key={titulo}
                  className="rounded-xl border border-stone-200 bg-white p-6"
                >
                  <span className="bg-brand-50 text-brand-700 flex size-10 items-center justify-center rounded-lg">
                    <Icono className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold text-stone-900">{titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{texto}</p>
                </div>
              ))}
            </div>

            <div className="bg-brand-800 mt-10 rounded-xl px-6 py-8 text-center sm:px-10">
              <p className="text-lg font-medium text-white">
                ¿Te interesa sumarte al club?
              </p>
              <p className="text-brand-100 mx-auto mt-2 max-w-xl text-sm">
                Escríbenos y te contamos cómo asociarte, cuánto es la cuota y cuál es la
                próxima salida.
              </p>
              {/* Con `cn` y no con una plantilla de texto: la variante trae
                  `bg-stone-900` y aquí se pide blanco. Concatenando, las dos
                  clases quedaban en el HTML y ganaba la que el CSS pusiera
                  después, no la de aquí. `cn` resuelve el conflicto. */}
              <a
                href="mailto:cmcollipulli@gmail.com"
                className={cn(
                  estiloBoton("secondary", "md"),
                  "text-brand-900 hover:bg-brand-100 mt-5 bg-white",
                )}
              >
                <Mail aria-hidden />
                Escribir al club
              </a>
            </div>
          </div>
        </section>

        {/* ---------------------------- Testimonios -------------------------- */}

        <section id="testimonios" className="scroll-mt-16 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-brand-700 text-sm font-medium tracking-wide uppercase">
              Experiencias
            </h2>
            <p className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-stone-900">
              La experiencia en el club
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {TESTIMONIOS.map((t) => (
                <figure
                  key={t.nombre}
                  className="flex flex-col rounded-xl border border-stone-200 bg-stone-50/70 p-6"
                >
                  <blockquote className="flex-1 text-stone-700">
                    <p className="text-pretty">«{t.texto}»</p>
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-stone-200 pt-4">
                    <Iniciales nombre={t.nombre} />
                    <span>
                      <span className="block text-sm font-semibold text-stone-900">
                        {t.nombre}
                      </span>
                      <span className="block text-xs text-stone-500">{t.detalle}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------- Footer ------------------------------ */}

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
                    href="mailto:cmcollipulli@gmail.com"
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    <Mail className="size-4" aria-hidden />
                    cmcollipulli@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/club_montana_collipulli"
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
    </>
  );
}
