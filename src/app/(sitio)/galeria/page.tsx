import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Images } from "lucide-react";

import { albumesPublicados } from "@/lib/consultas-galeria";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Galería",
  description:
    "Fotografías de las salidas del Club de Montaña Collipulli por la cordillera de La Araucanía.",
};

export default async function PaginaGaleria() {
  const albumes = await albumesPublicados();

  return (
    <main className="flex-1 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <header className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-stone-900">
            Galería
          </h1>
          <p className="mt-4 text-lg text-pretty text-stone-600">
            Las salidas del club, una por álbum. Fotos tomadas por los propios socios en
            la cordillera de La Araucanía.
          </p>
        </header>

        {albumes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 px-6 py-16 text-center">
            <Images className="size-7 text-stone-400" aria-hidden />
            <p className="font-medium text-stone-900">Todavía no hay álbumes</p>
            <p className="max-w-sm text-sm text-stone-500">
              Estamos ordenando las fotos de las últimas salidas. Vuelve pronto.
            </p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    <h2 className="font-semibold text-stone-900">{a.titulo}</h2>
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
        )}
      </div>
    </main>
  );
}
