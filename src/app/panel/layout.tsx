import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { Mountain } from "lucide-react";

import { db } from "@/db";
import { notificaciones } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { ETIQUETAS_ROL } from "@/lib/permisos";
import { BarraLateral, MenuMovil } from "@/components/panel/navegacion";
import { MenuUsuario } from "@/components/panel/menu-usuario";

export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  const usuario = await requerirUsuario();

  const [{ total: noLeidas } = { total: 0 }] = await db
    .select({ total: count() })
    .from(notificaciones)
    .where(
      and(eq(notificaciones.usuarioId, usuario.id), eq(notificaciones.leida, false)),
    );

  const nombre = `${usuario.nombres} ${usuario.apellidos}`;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <MenuMovil rol={usuario.rol} noLeidas={noLeidas} />

          <Link href="/panel" className="flex items-center gap-2.5">
            <span className="bg-brand-700 flex size-8 items-center justify-center rounded-lg text-white">
              <Mountain className="size-4" aria-hidden />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-stone-900 sm:block">
              Club de Montaña Collipulli
            </span>
          </Link>

          <div className="ml-auto">
            <MenuUsuario
              nombre={nombre}
              email={usuario.email}
              rol={ETIQUETAS_ROL[usuario.rol]}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <BarraLateral rol={usuario.rol} noLeidas={noLeidas} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
