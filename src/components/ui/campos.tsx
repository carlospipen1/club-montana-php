import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-stone-100 disabled:text-stone-500";

export function Etiqueta({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("block text-sm font-medium text-stone-700", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-24 resize-y", className)} {...props} />
  );
}

export function Selector({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "pr-8", className)} {...props} />;
}

/**
 * Envoltorio de un control: etiqueta, ayuda y error, con los atributos de
 * accesibilidad ya conectados (`htmlFor`, `aria-describedby`, `aria-invalid`).
 */
export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  requerido,
  children,
  className,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  requerido?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Etiqueta htmlFor={id}>
        {etiqueta}
        {requerido && (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        )}
      </Etiqueta>
      {children}
      {ayuda && !error && (
        <p id={idAyuda} className="text-xs text-stone-500">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
