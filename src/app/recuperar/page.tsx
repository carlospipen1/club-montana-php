import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { usuarioActual } from "@/lib/auth";
import { correoHabilitado } from "@/lib/correo";
import { Aviso } from "@/components/ui/avisos";
import { Marco } from "./marco";
import { FormularioSolicitud } from "./formulario";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

// Ver la nota del layout del sitio: prerenderizar obliga a Neon a responder
// durante el build, y ahí la cadena de conexión no está disponible.
export const dynamic = "force-dynamic";

export default async function PaginaRecuperar() {
  if (await usuarioActual()) redirect("/panel");

  // Mientras no haya envío de correo configurado el enlace no se muestra en el
  // ingreso, pero la dirección igual se puede escribir a mano o quedar guardada
  // en un marcador. Se explica en vez de fingir que funciona.
  if (!correoHabilitado()) {
    return (
      <Marco
        titulo="Todavía no está disponible"
        descripcion="El envío de correos del club aún no está configurado."
      >
        <Aviso tono="atencion">
          Por ahora, escríbele a la directiva y te generan una contraseña temporal
          para que puedas entrar y elegir la tuya.
        </Aviso>
      </Marco>
    );
  }

  return (
    <Marco
      titulo="¿Olvidaste tu contraseña?"
      descripcion="Escribe tu correo y te mandamos un enlace para crear una nueva."
    >
      <FormularioSolicitud />
    </Marco>
  );
}
