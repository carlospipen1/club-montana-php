import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mountain } from "lucide-react";

import { usuarioActual } from "@/lib/auth";
import { correoHabilitado } from "@/lib/correo";
import { Aviso } from "@/components/ui/avisos";
import { CuentasDemo } from "@/components/cuentas-demo";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Acceso a la intranet de socios del Club de Montaña Collipulli.",
  robots: { index: false, follow: false },
};

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  if (await usuarioActual()) redirect("/panel");

  const { siguiente, restablecida } = await searchParams;
  const destino = typeof siguiente === "string" ? siguiente : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="bg-brand-700 mx-auto flex size-11 items-center justify-center rounded-xl text-white">
            <Mountain className="size-5" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Intranet de socios
          </h1>
          <p className="text-sm text-stone-500">Club de Montaña Collipulli</p>
        </div>

        <CuentasDemo />

        {restablecida && (
          <Aviso tono="exito" titulo="Contraseña guardada">
            Ya puedes entrar con tu contraseña nueva.
          </Aviso>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs">
          <FormularioLogin
            siguiente={destino}
            recuperacionDisponible={correoHabilitado()}
          />
        </div>

        <p className="text-center text-xs text-stone-500">
          ¿No tienes cuenta? Las crea la directiva del club.{" "}
          <a
            href="mailto:cmcollipulli@gmail.com"
            className="text-brand-700 font-medium underline underline-offset-2"
          >
            Escríbenos
          </a>
          .
        </p>

        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al sitio
        </Link>
      </div>
    </main>
  );
}
