import Link from "next/link";
import { ArrowLeft, Mountain } from "lucide-react";
import type { ReactNode } from "react";

/**
 * La misma caja que la pantalla de ingreso, para que recuperar la contraseña no
 * se sienta como salir del sistema.
 */
export function Marco({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="bg-brand-700 mx-auto flex size-11 items-center justify-center rounded-xl text-white">
            <Mountain className="size-5" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            {titulo}
          </h1>
          <p className="text-sm text-stone-500">{descripcion}</p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs">
          {children}
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver a ingresar
        </Link>
      </div>
    </main>
  );
}
