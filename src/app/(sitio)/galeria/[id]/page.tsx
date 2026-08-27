import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import { GrillaFotos } from "@/components/landing/visor";
import { albumPublicado } from "@/lib/consultas-galeria";
import { formatearFecha } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/galeria/[id]">) {
  const { id } = await params;
  const datos = await albumPublicado(Number(id));

  if (!datos) return { title: "Álbum" };

  return {
    title: datos.album.titulo,
    description:
      datos.album.descripcion ??
      `Fotografías de ${datos.album.titulo}, Club de Montaña Collipulli.`,
    openGraph: {
      title: datos.album.titulo,
      images: datos.fotos[0] ? [datos.fotos[0].url] : undefined,
    },
  };
}

export default async function PaginaAlbum({ params }: PageProps<"/galeria/[id]">) {
  const { id } = await params;
  const albumId = Number(id);
  if (!Number.isInteger(albumId)) notFound();

  const datos = await albumPublicado(albumId);
  if (!datos) notFound();

  const { album, fotos } = datos;

  return (
    <main className="flex-1 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/#galeria"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Todos los álbumes
        </Link>

        <header className="mt-6 max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-stone-900">
            {album.titulo}
          </h1>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatearFecha(album.fecha)}
            </span>
            {album.lugar && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                {album.lugar}
              </span>
            )}
          </div>

          {album.descripcion && (
            <p className="mt-4 text-lg leading-relaxed text-pretty text-stone-600">
              {album.descripcion}
            </p>
          )}
        </header>

        <div className="mt-10">
          {fotos.length === 0 ? (
            <p className="text-stone-500">Este álbum todavía no tiene fotos.</p>
          ) : (
            <GrillaFotos fotos={fotos} />
          )}
        </div>
      </div>
    </main>
  );
}
