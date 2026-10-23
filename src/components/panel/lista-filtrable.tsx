"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Boton } from "@/components/ui/boton";

/**
 * Buscar y paginar una lista, en el navegador.
 *
 * Nació en el inventario de equipos y se sacó acá al necesitarlo también en
 * socios. Las dos listas tienen el mismo problema: eran un formulario que
 * recargaba la página con `?q=`, así que había que apretar Enter para ver algo
 * —y en equipos, la recarga se llevaba por delante lo que la persona llevaba
 * marcado para pedir—.
 *
 * Filtrar y paginar ocurren los dos acá, y eso no es casualidad: si el filtro
 * fuera del navegador y la paginación del servidor, buscar sólo encontraría lo
 * que cayó en la página actual, que es peor que no buscar.
 *
 * El tamaño que esto aguanta son cientos de filas, no miles: todas viajan en la
 * respuesta. Con 25 socios y 82 equipos sobra. Si algún día el club creciera de
 * verdad, habría que mover las dos cosas al servidor a la vez.
 */

/** Sin tildes y en minúsculas: "arnes" tiene que encontrar "Arnés". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type Lista = {
  consulta: string;
  setConsulta: (valor: string) => void;
  /** Coincide con la búsqueda, haya o no caído en la página que se ve. */
  coincide: (id: number) => boolean;
  /** Coincide **y** está en la página actual: es lo que se dibuja. */
  visible: (id: number) => boolean;
  coincidencias: number;
  total: number;
  pagina: number;
  paginas: number;
  irA: (pagina: number) => void;
};

const ContextoLista = createContext<Lista | null>(null);

function useLista(): Lista {
  const contexto = useContext(ContextoLista);
  if (!contexto) {
    throw new Error("Falta <ProveedorLista> alrededor de esta parte de la página.");
  }
  return contexto;
}

export function ProveedorLista({
  filas,
  porPagina = 25,
  children,
}: {
  /** Lo buscable de cada fila, ya armado por el servidor. */
  filas: { id: number; texto: string }[];
  porPagina?: number;
  children: ReactNode;
}) {
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);

  const valor = useMemo<Lista>(() => {
    // Cada palabra por separado, para que "juan perez" encuentre lo que
    // contiene las dos aunque estén al revés o con algo en medio.
    const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);

    const coincidentes = filas.filter(({ texto }) => {
      if (palabras.length === 0) return true;
      const normalizado = normalizar(texto);
      return palabras.every((p) => normalizado.includes(p));
    });

    const paginas = Math.max(1, Math.ceil(coincidentes.length / porPagina));
    // Si la búsqueda achicó la lista, la página en la que estábamos puede ya no
    // existir. Se cae a la última en vez de mostrar una página vacía.
    const actual = Math.min(pagina, paginas);

    const coincidentesIds = new Set(coincidentes.map((f) => f.id));
    const visiblesIds = new Set(
      coincidentes.slice((actual - 1) * porPagina, actual * porPagina).map((f) => f.id),
    );

    return {
      consulta,
      setConsulta: (v) => {
        setConsulta(v);
        // Escribir otra cosa empieza de nuevo: quedarse en la página 3 de una
        // búsqueda distinta no significa nada.
        setPagina(1);
      },
      coincide: (id) => coincidentesIds.has(id),
      visible: (id) => visiblesIds.has(id),
      coincidencias: coincidentes.length,
      total: filas.length,
      pagina: actual,
      paginas,
      irA: setPagina,
    };
  }, [consulta, filas, pagina, porPagina]);

  return <ContextoLista value={valor}>{children}</ContextoLista>;
}

export function BuscadorLista({
  marcador,
  nota,
}: {
  marcador: string;
  /** Una línea extra bajo el contador, cuando la pantalla la necesita. */
  nota?: string;
}) {
  const { consulta, setConsulta, coincidencias, total } = useLista();

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
          aria-hidden
        />
        <input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder={marcador}
          aria-label={marcador}
          className="focus-visible:outline-brand-600 w-full rounded-lg border border-stone-300 bg-white py-2 pr-3 pl-9 text-sm placeholder:text-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </div>

      {consulta.trim() !== "" && (
        <p className="mt-2 text-xs text-stone-500">
          {coincidencias === 0
            ? "Nada coincide."
            : `${coincidencias} de ${total}.${nota ? ` ${nota}` : ""}`}
        </p>
      )}
    </div>
  );
}

/** Una fila que se esconde si no coincide o si cayó en otra página. */
export function FilaLista({ id, children }: { id: number; children: ReactNode }) {
  const { visible } = useLista();
  return visible(id) ? children : null;
}

/** El "no hay nada", que sólo el navegador puede saber. */
export function SinCoincidencias({ children }: { children: ReactNode }) {
  const { coincidencias } = useLista();
  return coincidencias === 0 ? children : null;
}

/**
 * El paginador. No aparece si todo cabe en una página: un control que siempre
 * dice "1 de 1" es ruido.
 */
export function Paginador({ nombre = "filas" }: { nombre?: string }) {
  const { pagina, paginas, irA, coincidencias } = useLista();

  if (paginas <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3">
      <p className="text-xs text-stone-500">
        Página {pagina} de {paginas} · {coincidencias} {nombre}
      </p>
      <div className="flex items-center gap-2">
        <Boton
          variante="outline"
          tamano="sm"
          onClick={() => irA(pagina - 1)}
          disabled={pagina <= 1}
        >
          <ChevronLeft aria-hidden />
          Anterior
        </Boton>
        <Boton
          variante="outline"
          tamano="sm"
          onClick={() => irA(pagina + 1)}
          disabled={pagina >= paginas}
        >
          Siguiente
          <ChevronRight aria-hidden />
        </Boton>
      </div>
    </div>
  );
}
