import { RotateCcw } from "lucide-react";

import { accionReiniciarDemo } from "@/actions/demo";
import { modoDemo } from "@/lib/demo";

/**
 * Franja permanente de la demostración pública.
 *
 * Va arriba de todo y no se puede cerrar: quien entra tiene que saber en todo
 * momento que los datos son inventados y que puede hacer lo que quiera. Fuera
 * del despliegue de muestra no renderiza nada.
 */
export function AvisoDemo() {
  if (!modoDemo) return null;

  return (
    <div className="bg-amber-100 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 text-sm">
        <p>
          <strong className="font-semibold">Sistema de demostración.</strong> Los
          socios, las cuotas y las salidas son inventados. Prueba lo que quieras:
          los datos vuelven a su estado inicial cada vez que alguien ingresa.
        </p>
        <form action={accionReiniciarDemo}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white/70 px-3 py-1 font-medium whitespace-nowrap transition-colors hover:bg-white"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reiniciar datos
          </button>
        </form>
      </div>
    </div>
  );
}
