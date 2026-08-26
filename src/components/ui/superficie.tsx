import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tarjeta({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-stone-200 bg-white shadow-xs", className)}
      {...props}
    />
  );
}

export function TarjetaCabecera({
  titulo,
  descripcion,
  accion,
  className,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-5 py-4",
        className,
      )}
    >
      <div className="space-y-0.5">
        <h2 className="font-semibold text-stone-900">{titulo}</h2>
        {descripcion && <p className="text-sm text-stone-500">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

export function TarjetaCuerpo({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/** Encabezado de página: título, bajada y acciones a la derecha. */
export function CabeceraPagina({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {titulo}
        </h1>
        {descripcion && (
          <p className="max-w-2xl text-sm text-stone-500">{descripcion}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Estado vacío: qué falta y qué hacer al respecto. */
export function Vacio({
  icono,
  titulo,
  descripcion,
  children,
}: {
  icono?: ReactNode;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icono && (
        <div className="flex size-11 items-center justify-center rounded-full bg-stone-100 text-stone-400 [&_svg]:size-5">
          {icono}
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-stone-900">{titulo}</p>
        {descripcion && (
          <p className="mx-auto max-w-sm text-sm text-stone-500">{descripcion}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Métrica del panel: número grande con su etiqueta. */
export function Metrica({
  etiqueta,
  valor,
  detalle,
  icono,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono?: ReactNode;
  tono?: "neutro" | "positivo" | "atencion" | "alerta";
}) {
  const tonos = {
    neutro: "bg-stone-100 text-stone-600",
    positivo: "bg-emerald-50 text-emerald-700",
    atencion: "bg-amber-50 text-amber-700",
    alerta: "bg-red-50 text-red-700",
  } as const;

  return (
    <Tarjeta className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm text-stone-500">{etiqueta}</p>
          <p className="tabular text-2xl font-semibold text-stone-900">{valor}</p>
          {detalle && <p className="truncate text-xs text-stone-500">{detalle}</p>}
        </div>
        {icono && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5",
              tonos[tono],
            )}
          >
            {icono}
          </div>
        )}
      </div>
    </Tarjeta>
  );
}
