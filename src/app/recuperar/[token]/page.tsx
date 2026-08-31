import type { Metadata } from "next";
import Link from "next/link";

import { Aviso } from "@/components/ui/avisos";
import { buscarTokenVigente } from "@/lib/recuperacion";
import { Marco } from "../marco";
import { FormularioNuevaPassword } from "./formulario";

export const metadata: Metadata = {
  title: "Crear contraseña nueva",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PaginaNuevaPassword({
  params,
}: PageProps<"/recuperar/[token]">) {
  const { token } = await params;
  const vigente = await buscarTokenVigente(token);

  if (!vigente) {
    return (
      <Marco
        titulo="Este enlace ya no sirve"
        descripcion="Los enlaces duran una hora y se pueden usar una sola vez."
      >
        <div className="space-y-4">
          <Aviso tono="atencion">
            Puede que haya vencido, que ya lo hayas usado o que hayas pedido otro
            después: pedir un enlace nuevo anula el anterior.
          </Aviso>
          <Link
            href="/recuperar"
            className="text-brand-700 block text-center text-sm font-medium underline underline-offset-2"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      </Marco>
    );
  }

  return (
    <Marco
      titulo="Crea tu contraseña nueva"
      descripcion={`Hola ${vigente.usuario.nombres.split(" ")[0]}. Elige una contraseña y ya puedes entrar.`}
    >
      <FormularioNuevaPassword token={token} />
    </Marco>
  );
}
