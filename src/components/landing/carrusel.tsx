"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Foto } from "@/lib/galeria";
import { cn } from "@/lib/utils";

/**
 * Carrusel de fotos.
 *
 * El desplazamiento es scroll nativo con `scroll-snap`: en el teléfono se
 * arrastra con el dedo sin que intervenga JavaScript, y las flechas sólo
 * empujan ese mismo scroll. Es más liviano y más accesible que reimplementar
 * el gesto a mano.
 *
 * No avanza solo: una foto que cambia sin aviso molesta a quien está leyendo y
 * complica a quien navega con teclado.
 */
export function Carrusel({ fotos }: { fotos: Foto[] }) {
  const pista = useRef<HTMLUListElement>(null);
  const [activa, setActiva] = useState(0);

  /**
   * Se ajusta `scrollLeft` a mano en vez de usar `scrollIntoView`, que además
   * del carrusel puede mover el scroll vertical de la página entera.
   */
  const irA = useCallback((indice: number) => {
    const contenedor = pista.current;
    if (!contenedor) return;

    const destino = contenedor.children[indice] as HTMLElement | undefined;
    if (!destino) return;

    const centrado =
      destino.offsetLeft - (contenedor.clientWidth - destino.offsetWidth) / 2;

    contenedor.scrollTo({ left: centrado, behavior: "smooth" });
  }, []);

  /**
   * El indicador sigue al scroll real, venga de las flechas o del dedo.
   *
   * Se calcula cuál foto está más cerca del centro del contenedor. Un
   * IntersectionObserver no sirve aquí: en pantalla ancha se ven dos fotos a la
   * vez, dispara para ambas y termina ganando la última en llegar, con lo que
   * el indicador saltaba de la primera a la tercera.
   */
  useEffect(() => {
    const contenedor = pista.current;
    if (!contenedor) return;

    let pendiente = 0;

    const recalcular = () => {
      const centro = contenedor.scrollLeft + contenedor.clientWidth / 2;
      let mejor = 0;
      let menorDistancia = Infinity;

      Array.from(contenedor.children).forEach((hijo, i) => {
        const el = hijo as HTMLElement;
        const centroHijo = el.offsetLeft + el.offsetWidth / 2;
        const distancia = Math.abs(centroHijo - centro);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          mejor = i;
        }
      });

      setActiva(mejor);
    };

    const alDesplazar = () => {
      cancelAnimationFrame(pendiente);
      pendiente = requestAnimationFrame(recalcular);
    };

    recalcular();
    contenedor.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", alDesplazar);

    return () => {
      cancelAnimationFrame(pendiente);
      contenedor.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", alDesplazar);
    };
  }, [fotos.length]);

  if (fotos.length === 0) return null;

  const anterior = () => irA(Math.max(0, activa - 1));
  const siguiente = () => irA(Math.min(fotos.length - 1, activa + 1));

  return (
    <div className="relative">
      <ul
        ref={pista}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        aria-label="Fotografías del club"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            siguiente();
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            anterior();
          }
        }}
      >
        {fotos.map((foto, i) => (
          <li
            key={foto.src}
            data-indice={i}
            className="relative aspect-[3/2] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-stone-200 sm:w-[70%] lg:w-[55%]"
          >
            <Image
              src={foto.src}
              alt={foto.alt}
              fill
              sizes="(max-width: 640px) 85vw, (max-width: 1024px) 70vw, 55vw"
              className="object-cover"
              // Sólo la primera se carga con prioridad; el resto, al acercarse.
              priority={i === 0}
            />
            {foto.alt && (
              <p className="absolute inset-x-0 bottom-0 bg-linear-to-t from-stone-950/70 to-transparent px-4 pt-10 pb-3 text-sm text-white">
                {foto.alt}
              </p>
            )}
          </li>
        ))}
      </ul>

      {fotos.length > 1 && (
        <>
          <button
            type="button"
            onClick={anterior}
            disabled={activa === 0}
            aria-label="Foto anterior"
            className="absolute top-1/2 left-2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-md transition hover:bg-white disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={siguiente}
            disabled={activa === fotos.length - 1}
            aria-label="Foto siguiente"
            className="absolute top-1/2 right-2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-md transition hover:bg-white disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div className="mt-4 flex justify-center gap-2">
            {fotos.map((foto, i) => (
              <button
                key={foto.src}
                type="button"
                onClick={() => irA(i)}
                aria-label={`Ir a la foto ${i + 1} de ${fotos.length}`}
                aria-current={i === activa ? "true" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === activa
                    ? "w-6 bg-stone-800"
                    : "w-1.5 bg-stone-300 hover:bg-stone-400",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
