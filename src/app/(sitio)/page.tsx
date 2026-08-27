import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Images,
  Lock,
  Mail,
  ScrollText,
  Tag,
} from "lucide-react";

import { Carrusel } from "@/components/landing/carrusel";
import { CORREO_CLUB } from "@/components/landing/cabecera";
import { estiloBoton } from "@/components/ui/boton";
import {
  albumesPublicados,
  fotoDePortada,
  fotosDelCarrusel,
} from "@/lib/consultas-galeria";
import { cn, formatearFecha } from "@/lib/utils";

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

/**
 * Testimonios reales, entregados por sus autores. Van ordenados por cuánto
 * muestra la foto a la persona dentro del paisaje: es lo que la sección quiere
 * contar, así que las mejores abren. El texto se conserva tal como lo
 * escribieron; los párrafos van separados en el arreglo.
 */
const TESTIMONIOS = [
  {
    parrafos: [
      "Llevo tres años siendo parte de este club y he aprendido mucho, no solo sobre seguridad, técnicas y maniobras en la montaña sino también sobre confianza, perseverancia y compañerismo.",
      "Gracias al club he tenido la oportunidad de conocer lugares hermosos, conquistar cumbres y vivir desafiantes y aventureras experiencias.",
      "Una de las cosas que más valoro es la linda familia montañera que hemos construido como club, un grupo de personas que comparte la pasión por la montaña, que se apoya y que disfruta cada aventura, tanto en los grandes desafíos como en los pequeños momentos del camino.",
      "Estos tres años han sido de mucho aprendizaje, experiencias inolvidables y, sobre todo, de amor por la montaña y por esta comunidad que tengo la suerte de llamar mi club.",
    ],
    nombre: "Arantxa Mol",
    detalle: "Socia del club",
    foto: "/testimonios/arantxa-mol.jpg",
    alto: "Arantxa Mol de pie en un filo nevado, mirando el valle y la cordillera",
  },
  {
    parrafos: [
      "El club de montaña Collipulli me ha permitido desarrollar el deporte de montaña más allá de mis expectativas, en donde a través de su proceso formativo, he adquirido herramientas y habilidades para lograr autonomía, todo acorde al compañerismo y el respeto por la naturaleza.",
    ],
    nombre: "Juan Ulloa",
    detalle: "Presidente del club",
    foto: "/testimonios/juan-ulloa.jpg",
    alto: "Juan Ulloa sosteniendo la bandera del club en una cumbre nevada",
  },
  {
    parrafos: ["Aventura, inspiración y naturaleza... La combinación perfecta."],
    nombre: "Rodrigo Paredes",
    detalle: "Socio del club",
    foto: "/testimonios/rodrigo-paredes.jpg",
    alto: "Rodrigo Paredes ascendiendo con esquís por una ladera nevada",
  },
  {
    parrafos: [
      "El 2023 nos unimos al club con mi esposa, y hoy no sabría separar una cosa de la otra: la montaña se volvió algo que hacemos juntos. Desde el año pasado estoy a cargo de la Comisión Técnica, y esa responsabilidad me hizo crecer más rápido que cualquier salida: planificar, decidir cuándo seguir y cuándo volver, hacerme cargo de que el grupo llegue completo.",
      "En ese mismo tiempo empecé a hacer esquí de montaña, aprendiendo de mis referentes y amigos dentro del club. Eso es lo que más valoro: acá nadie guarda lo que sabe.",
      "Hemos cumplido los objetivos que nos propusimos y lo hemos hecho sin accidentes. Para mí ese es el logro real.",
    ],
    nombre: "Carlos Aburto",
    detalle: "Encargado de la Comisión Técnica",
    foto: "/testimonios/carlos-aburto.jpg",
    alto: "Carlos Aburto con esquís de montaña en una ladera nevada",
  },
  {
    parrafos: [
      "Ha sido una experiencia muy positiva, llena de aprendizajes y nuevos desafíos, que te prepara para vivir la montaña de forma segura, responsable y consciente, rodeado de grandes personas.",
    ],
    nombre: "Karen Reyes",
    detalle: "Socia del club",
    foto: "/testimonios/karen-reyes.jpg",
    alto: "Karen Reyes sentada en la nieve con la cordillera detrás",
  },
  {
    parrafos: [
      "La montaña ha sido para mí mucho más que un lugar para disfrutar de la naturaleza. Cada experiencia vivida en ella ha significado aprendizaje, esfuerzo y momentos inolvidables.",
      "Compartir una ruta, contemplar los paisajes, superar el cansancio y llegar a la cima genera una sensación de satisfacción difícil de explicar. La montaña también enseña a valorar la tranquilidad, el compañerismo y la importancia de disfrutar cada paso del camino.",
      "Cada salida deja recuerdos, nuevas historias y la motivación para volver. Sin duda, las experiencias de montaña se transforman en momentos que uno guarda para siempre.",
    ],
    nombre: "Ronald Molina",
    detalle: "Socio del club",
    foto: "/testimonios/ronald-molina.jpg",
    alto: "Ronald Molina de pie en la nieve con sus bastones",
  },
  {
    parrafos: [
      "Gracias al club, he logrado aprender cosas nuevas que me han ayudado a sentirme más seguro en la montaña. Además, me ha ayudado a superar mis propios límites, tanto físicos como mentales, y siempre se siente un espíritu de compañerismo que se fortalece con cada salida a la montaña.",
    ],
    nombre: "Patricio García",
    detalle: "Socio del club",
    foto: "/testimonios/patricio-garcia.jpg",
    alto: "Patricio García en una cumbre nevada, con un volcán al fondo",
  },
  {
    parrafos: [
      "No podemos pelear contra la montaña, solo esperamos, se hará lo que ella diga. Si la montaña dice «no» hay que esperar... Si la montaña dice «sube» entonces subimos.",
    ],
    nombre: "Jonathan Paredes",
    detalle: "Socio del club",
    foto: "/testimonios/jonathan-paredes.jpg",
    alto: "Jonathan Paredes en una cumbre invernal junto a penitentes de nieve",
  },
  {
    parrafos: [
      "Ser parte del Club de Montaña Collipulli ha sido una experiencia muy especial. Qué bonito es encontrar un grupo de personas con quienes compartir la montaña y disfrutarla con la misma pasión.",
      "Más allá de aprender, lo lindo ha sido vivirla juntos, emocionarnos con una cumbre, contemplar un paisaje, enfrentar desafíos y disfrutar también de las risas y anécdotas que quedan en el camino.",
      "Agradezco mucho ser parte de este club y haber encontrado aquí un grupo con el que cada salida se transforma en una experiencia que vale la pena guardar.",
    ],
    nombre: "Valentina Cortés",
    detalle: "Socia del club",
    foto: "/testimonios/valentina-cortes.jpg",
    alto: "Valentina Cortés al amanecer en altura, con la cordillera al fondo",
  },
];

export default async function PaginaInicio() {
  const [portada, fotos, albumes] = await Promise.all([
    fotoDePortada(),
    fotosDelCarrusel(),
    albumesPublicados(),
  ]);

  return (
    <main className="flex-1">
      {/* -------------------------------- Hero ------------------------------- */}

      {/* La portada necesita altura propia. Si se la da sólo el texto, en un
          monitor ancho queda una franja baja y `object-cover` recorta la foto
          por arriba y por abajo hasta dejar una tira sin contexto.

          El tope en pantallas grandes es el alto de la ventana menos la
          cabecera, para que la foto llene lo visible sin empujar el resto fuera
          de vista. Se usa `svh` y no `vh` porque en el teléfono la barra del
          navegador aparece y desaparece, y `vh` provoca saltos. */}
      <section className="bg-brand-950 relative flex min-h-[28rem] items-center overflow-hidden sm:min-h-[34rem] lg:min-h-[min(40rem,calc(100svh-5rem))]">
        {portada ? (
          <>
            {/* Es la imagen más pesada de la página: se carga con prioridad para
                que no aparezca un rectángulo vacío mientras baja. */}
            <Image
              src={portada.url}
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

        {/* El escudo va arriba a la derecha, sobre el cielo: centrado tapaba las
            caras de quienes salen en la foto. */}
        <Image
          src="/logo.png"
          alt="Escudo del Club de Montaña Collipulli"
          width={320}
          height={320}
          className="absolute top-5 right-4 z-10 size-20 object-contain drop-shadow-xl sm:top-8 sm:right-8 sm:size-28 lg:size-32"
          priority
        />

        {/* `w-full` es lo que permite que el centrado vertical de la sección
            funcione: sin ancho propio, el bloque se encoge al texto. */}
        <div className="relative mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm ring-inset">
            Comunidad de montaña
          </span>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
            Club de Montaña Collipulli
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-white/90">
            Difundimos y practicamos el montañismo: senderismo, alta montaña y escalada.
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

      {/* ------------------------------- Carrusel ---------------------------- */}

      {fotos.length > 0 && (
        <section id="fotos" className="scroll-mt-16 bg-stone-950">
          <div className="py-16 sm:py-20">
            <div className="mx-auto mb-8 flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
              <div>
                <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
                  Galería
                </h2>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                  La cordillera, por nuestros ojos
                </p>
              </div>

              {/* Baja a los álbumes, que ahora están en esta misma página. */}
              {albumes.length > 0 && (
                <a
                  href="#galeria"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/25 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 [&_svg]:size-4"
                >
                  <Images aria-hidden />
                  Ver todos los álbumes
                </a>
              )}
            </div>

            <Carrusel fotos={fotos.map((f) => ({ src: f.url, alt: f.pie ?? "" }))} />
          </div>
        </section>
      )}

      {/* -------------------------------- Somos ------------------------------ */}

      <section id="somos" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-brand-700 text-sm font-medium tracking-wide uppercase">
            Somos
          </h2>
          <p className="mt-4 text-xl leading-relaxed text-pretty text-stone-700">
            El Club de Montaña Collipulli es una organización deportiva{" "}
            <strong className="font-semibold text-stone-900">sin fines de lucro</strong>{" "}
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

      {/* ----------------------------- Beneficios ---------------------------- */}

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
                `bg-stone-900 text-white` y aquí se pide lo contrario.
                Concatenando, las cuatro clases quedaban en el HTML y ganaba la
                que el CSS pusiera después: salía blanco sobre blanco. */}
            <a
              href={`mailto:${CORREO_CLUB}`}
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

      {/* ------------------------------ Álbumes ------------------------------ */}

      {/* Los álbumes viven aquí y no en una página aparte: quien llega a la
          portada ya vio el carrusel arriba, y al terminar de leer qué implica
          ser socio se encuentra con las salidas de verdad, sin tener que
          navegar a otro lado. Cada álbum sí abre su propia página, que es donde
          están todas sus fotos. */}
      {albumes.length > 0 && (
        <section id="galeria" className="scroll-mt-16 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-brand-700 text-sm font-medium tracking-wide uppercase">
                Álbumes
              </h2>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-900">
                Nuestras salidas, una por una
              </p>
              <p className="mt-3 text-pretty text-stone-600">
                Fotografías tomadas por los propios socios. Entra a cualquiera para
                verlas completas.
              </p>
            </div>

            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {albumes.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/galeria/${a.id}`}
                    className="group block overflow-hidden rounded-xl border border-stone-200 bg-white transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-[3/2] overflow-hidden bg-stone-100">
                      {a.portada ? (
                        <Image
                          src={a.portada}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-stone-300">
                          <Images className="size-8" aria-hidden />
                        </span>
                      )}
                      <span className="tabular absolute right-3 bottom-3 rounded-full bg-stone-950/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {a.totalFotos} foto{a.totalFotos === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="space-y-1 p-5">
                      <h3 className="font-semibold text-stone-900">{a.titulo}</h3>
                      <p className="text-sm text-stone-500">
                        {formatearFecha(a.fecha)}
                        {a.lugar ? ` · ${a.lugar}` : ""}
                      </p>
                      {a.descripcion && (
                        <p className="line-clamp-2 pt-1 text-sm text-stone-600">
                          {a.descripcion}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------------------------- Testimonios ---------------------------- */}

      <section id="testimonios" className="scroll-mt-16 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-brand-700 text-sm font-medium tracking-wide uppercase">
            Experiencias
          </h2>
          <p className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-stone-900">
            La experiencia en el club
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {TESTIMONIOS.map((t, i) => (
              <figure
                key={t.nombre}
                className={cn(
                  "grid overflow-hidden rounded-xl border border-stone-200 bg-white",
                  // La foto cambia de lado en cada fila para que la sección no se
                  // lea como una lista. La columna fija tiene que cambiar de lado
                  // junto con ella: con `order` a secas, el texto se quedaba con
                  // los 430 px y la foto se estiraba.
                  i % 2 === 0
                    ? "md:grid-cols-[430px_1fr]"
                    : "md:grid-cols-[1fr_430px]",
                )}
              >
                <div
                  className={cn(
                    // En móvil la foto va arriba, y la caja toma la proporción
                    // vertical de las fotos (3:4) en vez de una altura fija: con
                    // una franja apaisada el recorte centrado dejaba a la persona
                    // sin cabeza. En escritorio la altura la manda la fila.
                    "relative aspect-3/4 md:aspect-auto md:h-auto",
                    i % 2 === 1 && "md:order-2",
                  )}
                >
                  <Image
                    src={t.foto}
                    alt={t.alto}
                    fill
                    sizes="(min-width: 768px) 430px, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-10 md:min-h-[420px]">
                  <blockquote className="space-y-3 text-lg leading-relaxed text-stone-700">
                    {t.parrafos.map((parrafo, p) => (
                      <p key={p} className="text-pretty">
                        {p === 0 && "«"}
                        {parrafo}
                        {p === t.parrafos.length - 1 && "»"}
                      </p>
                    ))}
                  </blockquote>
                  <figcaption className="mt-7 border-t border-stone-200 pt-5">
                    <span className="block text-sm font-semibold text-stone-900">
                      {t.nombre}
                    </span>
                    <span className="block text-xs text-stone-500">{t.detalle}</span>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
