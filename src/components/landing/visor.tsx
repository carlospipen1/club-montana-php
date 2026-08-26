"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type FotoVisor = { id: number; url: string; pie: string | null };

/**
 * Grilla de fotos con visor a pantalla completa.
 *
 * El visor es un `<dialog>` nativo: la trampa de foco, el cierre con Escape y
 * el fondo inerte los pone el navegador. Sólo hay que añadir las flechas del
 * teclado para recorrer las fotos.
 */
export function GrillaFotos({ fotos }: { fotos: FotoVisor[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);

  useEffect(() => {
    if (abierta === null) return;

    function alTeclado(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setAbierta((i) => (i === null ? null : Math.min(fotos.length - 1, i + 1)));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setAbierta((i) => (i === null ? null : Math.max(0, i - 1)));
      }
      if (e.key === "Escape") setAbierta(null);
    }

    document.addEventListener("keydown", alTeclado);
    // Mientras el visor está abierto, la página de atrás no debe desplazarse.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alTeclado);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierta, fotos.length]);

  const foto = abierta === null ? null : fotos[abierta];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fotos.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setAbierta(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-stone-200"
              aria-label={f.pie ? `Ampliar: ${f.pie}` : `Ampliar la foto ${i + 1}`}
            >
              <Image
                src={f.url}
                alt={f.pie ?? ""}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {foto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-stone-950/95"
          role="dialog"
          aria-modal="true"
          aria-label={foto.pie ?? "Fotografía"}
        >
          <div className="flex justify-end p-4">
            <button
              type="button"
              onClick={() => setAbierta(null)}
              aria-label="Cerrar"
              className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
            <Image
              src={foto.url}
              alt={foto.pie ?? ""}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <div className="flex items-center justify-between gap-4 p-4">
            <button
              type="button"
              onClick={() => setAbierta((i) => Math.max(0, (i ?? 0) - 1))}
              disabled={abierta === 0}
              aria-label="Foto anterior"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-25"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>

            <p className="min-w-0 flex-1 text-center text-sm text-white/80">
              {foto.pie}
              <span className="tabular mt-0.5 block text-xs text-white/40">
                {(abierta ?? 0) + 1} de {fotos.length}
              </span>
            </p>

            <button
              type="button"
              onClick={() =>
                setAbierta((i) => Math.min(fotos.length - 1, (i ?? 0) + 1))
              }
              disabled={abierta === fotos.length - 1}
              aria-label="Foto siguiente"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-25"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
