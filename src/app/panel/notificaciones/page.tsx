import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  Backpack,
  Bell,
  CheckCheck,
  FileText,
  Info,
  Mountain,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import {
  accionEliminarNotificacion,
  accionMarcarLeida,
  accionMarcarTodasLeidas,
} from "@/actions/notificaciones";
import { db } from "@/db";
import { notificaciones } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { cn, tiempoRelativo } from "@/lib/utils";
import { Boton } from "@/components/ui/boton";
import { CabeceraPagina, Tarjeta, Vacio } from "@/components/ui/superficie";

export const metadata = { title: "Notificaciones" };

const ICONOS = {
  equipo: Backpack,
  salida: Mountain,
  cuota: Wallet,
  acta: FileText,
  reunion: Users,
  sistema: Info,
} as const;

export default async function PaginaNotificaciones() {
  const usuario = await requerirUsuario();

  const lista = await db
    .select()
    .from(notificaciones)
    .where(eq(notificaciones.usuarioId, usuario.id))
    .orderBy(desc(notificaciones.creadoEn))
    .limit(100);

  const noLeidas = lista.filter((n) => !n.leida).length;

  return (
    <>
      <CabeceraPagina
        titulo="Notificaciones"
        descripcion={
          noLeidas > 0 ? `Tienes ${noLeidas} sin leer.` : "Estás al día con los avisos."
        }
      >
        {noLeidas > 0 && (
          <form action={accionMarcarTodasLeidas}>
            <Boton type="submit" variante="outline">
              <CheckCheck aria-hidden />
              Marcar todas como leídas
            </Boton>
          </form>
        )}
      </CabeceraPagina>

      <Tarjeta>
        {lista.length === 0 ? (
          <Vacio
            icono={<Bell aria-hidden />}
            titulo="No tienes notificaciones"
            descripcion="Acá llegarán los avisos de salidas nuevas, préstamos de equipo y cuotas."
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {lista.map((n) => {
              const Icono = ICONOS[n.tipo];
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4",
                    !n.leida && "bg-brand-50/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      n.leida
                        ? "bg-stone-100 text-stone-400"
                        : "bg-brand-100 text-brand-700",
                    )}
                  >
                    <Icono className="size-4" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm",
                        n.leida ? "text-stone-700" : "font-semibold text-stone-900",
                      )}
                    >
                      {n.titulo}
                    </p>
                    <p className="text-sm text-stone-600">{n.mensaje}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-stone-400">
                        {tiempoRelativo(n.creadoEn)}
                      </span>
                      {n.enlace && (
                        <Link
                          href={n.enlace}
                          className="text-brand-700 text-xs font-medium underline underline-offset-2"
                        >
                          Ver
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {!n.leida && (
                      <form action={accionMarcarLeida}>
                        <input type="hidden" name="id" value={n.id} />
                        <Boton
                          type="submit"
                          variante="ghost"
                          tamano="sm"
                          aria-label="Marcar como leída"
                        >
                          <CheckCheck aria-hidden />
                        </Boton>
                      </form>
                    )}
                    <form action={accionEliminarNotificacion}>
                      <input type="hidden" name="id" value={n.id} />
                      <Boton
                        type="submit"
                        variante="ghost"
                        tamano="sm"
                        className="text-stone-400 hover:text-red-700"
                        aria-label="Eliminar notificación"
                      >
                        <Trash2 aria-hidden />
                      </Boton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}
