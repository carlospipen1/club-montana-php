"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Foto } from "@/lib/galeria";
import { cn } from "@/lib/utils";

/**
 * Ancho de cada foto. Deja asomando la siguiente, que es lo que le dice a
 * cualquiera que la fila continúa hacia la derecha.
 */
const ANCHO_FOTO = "w-[88%] sm:w-[74%] lg:w-[62%]";

/**
 * Carrusel de fotos, pensado para ir sobre fondo oscuro y de borde a borde.
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

  /** Margen interno de la pista: es donde debe quedar el borde de la foto activa. */
  const margenIzquierdo = (contenedor: HTMLElement) =>
    parseFloat(getComputedStyle(contenedor).paddingLeft) || 0;

  /**
   * Las fotos se alinean por la izquierda, no al centro.
   *
   * Con centrado, la primera y la última no pueden centrarse —chocan con el
   * extremo del scroll—, así que su posición no coincidía con la del resto y
   * las flechas quedaban descuadradas respecto de la imagen.
   *
   * Se ajusta `scrollLeft` a mano en vez de usar `scrollIntoView`, que además
   * del carrusel puede mover el scroll vertical de la página entera.
   */
  const irA = useCallback((indice: number) => {
    const contenedor = pista.current;
    if (!contenedor) return;

    const destino = contenedor.children[indice] as HTMLElement | undefined;
    if (!destino) return;

    contenedor.scrollTo({
      left: destino.offsetLeft - margenIzquierdo(contenedor),
      behavior: "smooth",
    });
  }, []);

  /**
   * El indicador sigue al scroll real, venga de las flechas o del dedo.
   *
   * Se busca la foto cuyo borde izquierdo está más cerca del inicio visible de
   * la pista. Un IntersectionObserver no sirve aquí: en pantalla ancha se ven
   * dos fotos a la vez, dispara para ambas y termina ganando la última en
   * llegar, con lo que el indicador saltaba de la primera a la tercera.
   */
  useEffect(() => {
    const contenedor = pista.current;
    if (!contenedor) return;

    let pendiente = 0;

    const recalcular = () => {
      const maximo = contenedor.scrollWidth - contenedor.clientWidth;

      // Los extremos se resuelven aparte. La última foto nunca llega a alinearse
      // por la izquierda —el scroll se acaba antes— y sin esto el indicador se
      // quedaba clavado en la penúltima. Se toleran 2 px de holgura porque el
      // scroll suave termina en valores fraccionarios.
      if (contenedor.scrollLeft >= maximo - 2) return setActiva(fotos.length - 1);
      if (contenedor.scrollLeft <= 2) return setActiva(0);

      const inicioVisible = contenedor.scrollLeft + margenIzquierdo(contenedor);
      let mejor = 0;
      let menorDistancia = Infinity;

      Array.from(contenedor.children).forEach((hijo, i) => {
        const distancia = Math.abs((hijo as HTMLElement).offsetLeft - inicioVisible);
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

  const variasFotos = fotos.length > 1;
  const anterior = () => irA(Math.max(0, activa - 1));
  const siguiente = () => irA(Math.min(fotos.length - 1, activa + 1));

  const estiloFlecha =
    "pointer-events-auto flex size-11 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-lg backdrop-blur-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-0";

  return (
    <div>
      {/* Envuelve sólo la pista: si abarcara también los puntos de abajo, las
          flechas quedarían descentradas respecto de la imagen. */}
      <div className="relative">
        <ul
          ref={pista}
          className="flex snap-x snap-mandatory scroll-pl-4 [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [-ms-overflow-style:none] sm:scroll-pl-6 sm:gap-5 sm:px-6 [&::-webkit-scrollbar]:hidden"
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
              className={cn(
                "relative aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-2xl bg-stone-800 sm:aspect-[3/2]",
                ANCHO_FOTO,
              )}
            >
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes="(max-width: 640px) 88vw, (max-width: 1024px) 74vw, 62vw"
                className="object-cover"
                // Sólo la primera se carga con prioridad; el resto, al acercarse.
                priority={i === 0}
              />
              {foto.alt && (
                <p className="absolute inset-x-0 bottom-0 bg-linear-to-t from-stone-950/80 to-transparent px-5 pt-12 pb-4 text-sm font-medium text-white">
                  {foto.alt}
                </p>
              )}
            </li>
          ))}
        </ul>

        {variasFotos && (
          /* Flotan sobre los extremos de la pista. El contenedor no intercepta
             clics —eso impediría arrastrar la fila—; sólo los botones lo hacen.
             En móvil no aparecen: ahí se arrastra con el dedo. */
          <div className="pointer-events-none absolute inset-y-0 right-0 left-0 hidden items-center justify-between px-3 pb-2 sm:flex">
            <button
              type="button"
              onClick={anterior}
              disabled={activa === 0}
              aria-label="Foto anterior"
              className={estiloFlecha}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>

            <button
              type="button"
              onClick={siguiente}
              disabled={activa === fotos.length - 1}
              aria-label="Foto siguiente"
              className={estiloFlecha}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {variasFotos && (
        <div className="mt-6 flex justify-center gap-2">
          {fotos.map((foto, i) => (
            <button
              key={foto.src}
              type="button"
              onClick={() => irA(i)}
              aria-label={`Ir a la foto ${i + 1} de ${fotos.length}`}
              aria-current={i === activa ? "true" : undefined}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activa ? "w-7 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
