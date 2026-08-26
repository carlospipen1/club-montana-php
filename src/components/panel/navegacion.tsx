"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Backpack,
  Bell,
  ClipboardCheck,
  FileText,
  Images,
  LayoutDashboard,
  Menu,
  Mountain,
  Settings,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { puede, type Capacidad } from "@/lib/permisos";
import type { Rol } from "@/db/schema";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  etiqueta: string;
  Icono: typeof LayoutDashboard;
  /** Si se indica, el enlace sólo aparece para quien tenga esa capacidad. */
  requiere?: Capacidad;
};

const SECCIONES: { titulo?: string; items: Item[] }[] = [
  {
    items: [
      { href: "/panel", etiqueta: "Inicio", Icono: LayoutDashboard },
      { href: "/panel/mi-actividad", etiqueta: "Mi actividad", Icono: Activity },
      { href: "/panel/notificaciones", etiqueta: "Notificaciones", Icono: Bell },
    ],
  },
  {
    titulo: "Club",
    items: [
      { href: "/panel/salidas", etiqueta: "Salidas", Icono: Mountain },
      { href: "/panel/actas", etiqueta: "Actas", Icono: FileText },
      {
        href: "/panel/galeria",
        etiqueta: "Galería",
        Icono: Images,
        requiere: "gestionarGaleria",
      },
      { href: "/panel/equipos", etiqueta: "Equipos", Icono: Backpack },
      {
        href: "/panel/prestamos",
        etiqueta: "Préstamos",
        Icono: ClipboardCheck,
        requiere: "gestionarPrestamos",
      },
      { href: "/panel/cuotas", etiqueta: "Cuotas", Icono: Wallet },
      {
        href: "/panel/socios",
        etiqueta: "Socios",
        Icono: Users,
        requiere: "verSocios",
      },
    ],
  },
  {
    titulo: "Cuenta",
    items: [
      { href: "/panel/perfil", etiqueta: "Mi perfil", Icono: User },
      {
        href: "/panel/admin",
        etiqueta: "Administración",
        Icono: Settings,
        requiere: "administrarSistema",
      },
    ],
  },
];

function esActivo(pathname: string, href: string) {
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

function Enlaces({
  rol,
  noLeidas,
  onNavegar,
}: {
  rol: Rol;
  noLeidas: number;
  onNavegar?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6" aria-label="Secciones de la intranet">
      {SECCIONES.map((seccion, i) => {
        const visibles = seccion.items.filter(
          (item) => !item.requiere || puede(rol, item.requiere),
        );
        if (visibles.length === 0) return null;

        return (
          <div key={seccion.titulo ?? i} className="space-y-1">
            {seccion.titulo && (
              <p className="px-3 pb-1 text-xs font-medium tracking-wide text-stone-400 uppercase">
                {seccion.titulo}
              </p>
            )}
            {visibles.map(({ href, etiqueta, Icono }) => {
              const activo = esActivo(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavegar}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    activo
                      ? "bg-brand-50 text-brand-800 font-medium"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                  )}
                >
                  <Icono className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{etiqueta}</span>
                  {href === "/panel/notificaciones" && noLeidas > 0 && (
                    <span className="tabular bg-brand-700 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white">
                      {noLeidas > 99 ? "99+" : noLeidas}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function BarraLateral({ rol, noLeidas }: { rol: Rol; noLeidas: number }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white lg:block">
      <div className="sticky top-0 max-h-screen overflow-y-auto px-4 py-6">
        <Enlaces rol={rol} noLeidas={noLeidas} />
      </div>
    </aside>
  );
}

export function MenuMovil({ rol, noLeidas }: { rol: Rol; noLeidas: number }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className="flex size-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-stone-900/40"
          />
          <div className="relative flex w-72 max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <span className="font-semibold text-stone-900">Menú</span>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="flex size-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <Enlaces
                rol={rol}
                noLeidas={noLeidas}
                onNavegar={() => setAbierto(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
