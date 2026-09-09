"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

/**
 * Filtro del inventario, en el navegador.
 *
 * Antes la búsqueda era un formulario que recargaba la página con `?q=`. Eso
 * hacía dos cosas malas: había que apretar Enter para ver algo, y la recarga se
 * llevaba por delante lo que la persona tenía marcado —justo lo que uno hace al
 * armar un pedido: buscar "arnés", marcar, buscar "cuerda", marcar—.
 *
 * Con 82 equipos filtrar acá es instantáneo y no cuesta nada: las filas ya
 * viajaron todas en la respuesta. Si algún día el inventario llegara a miles,
 * habría que volver a filtrar en el servidor y guardar la selección en otra
 * parte.
 *
 * Ojo: filtrar **esconde**, no desmarca. Un equipo marcado sigue en el pedido
 * aunque la búsqueda ya no lo muestre.
 */

/** Sin tildes y en minúsculas: "arnes" tiene que encontrar "Arnés". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type Filtro = {
  consulta: string;
  setConsulta: (valor: string) => void;
  visible: (id: number) => boolean;
  coincidencias: number;
  total: number;
};

const ContextoFiltro = createContext<Filtro | null>(null);

function useFiltro(): Filtro {
  const contexto = useContext(ContextoFiltro);
  if (!contexto) {
    throw new Error("Falta <ProveedorFiltro> alrededor de esta parte de la página.");
  }
  return contexto;
}

export function ProveedorFiltro({
  filas,
  children,
}: {
  /** Lo buscable de cada fila: nombre, categoría y descripción, ya juntos. */
  filas: { id: number; texto: string }[];
  children: ReactNode;
}) {
  const [consulta, setConsulta] = useState("");

  const valor = useMemo<Filtro>(() => {
    // Cada palabra por separado, para que "arnes mammut" encuentre lo que
    // contiene las dos aunque estén al revés o con algo en medio.
    const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);

    const coinciden = new Set(
      filas
        .filter(({ texto }) => {
          if (palabras.length === 0) return true;
          const normalizado = normalizar(texto);
          return palabras.every((p) => normalizado.includes(p));
        })
        .map((f) => f.id),
    );

    return {
      consulta,
      setConsulta,
      visible: (id) => coinciden.has(id),
      coincidencias: coinciden.size,
      total: filas.length,
    };
  }, [consulta, filas]);

  return <ContextoFiltro value={valor}>{children}</ContextoFiltro>;
}

export function BuscadorEquipos() {
  const { consulta, setConsulta, coincidencias, total } = useFiltro();

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
          placeholder="Buscar por nombre, categoría o descripción…"
          aria-label="Buscar equipos"
          className="focus-visible:outline-brand-600 w-full rounded-lg border border-stone-300 bg-white py-2 pr-3 pl-9 text-sm placeholder:text-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </div>

      {consulta.trim() !== "" && (
        <p className="mt-2 text-xs text-stone-500">
          {coincidencias === 0
            ? "Ningún equipo coincide."
            : `${coincidencias} de ${total} equipos. Lo que ya marcaste sigue en tu pedido aunque no se vea acá.`}
        </p>
      )}
    </div>
  );
}

/** Una fila que se esconde cuando no coincide con la búsqueda. */
export function FilaFiltrable({ id, children }: { id: number; children: ReactNode }) {
  const { visible } = useFiltro();
  return visible(id) ? children : null;
}

/** El "no hay nada" de la búsqueda, que sólo el navegador puede saber. */
export function SinCoincidencias({ children }: { children: ReactNode }) {
  const { coincidencias } = useFiltro();
  return coincidencias === 0 ? children : null;
}
