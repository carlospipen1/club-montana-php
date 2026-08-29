import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Tabla                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * La tabla siempre va dentro de un contenedor con scroll horizontal propio:
 * en un teléfono se desplaza la tabla, nunca la página completa.
 */
export function Tabla({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-max text-sm", className)} {...props} />
    </div>
  );
}

export function TablaCabecera({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "border-b border-stone-200 text-left text-xs font-medium tracking-wide text-stone-500 uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TablaCuerpo({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-stone-100", className)} {...props} />;
}

export function Fila({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("hover:bg-stone-50/70", className)} {...props} />;
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th scope="col" className={cn("px-4 py-3 font-medium", className)} {...props} />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 text-stone-700", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/*  Insignias de estado                                                        */
/* -------------------------------------------------------------------------- */

const tonos = {
  neutro: "bg-stone-100 text-stone-700 ring-stone-200",
  info: "bg-brand-50 text-brand-700 ring-brand-200",
  exito: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  atencion: "bg-amber-50 text-amber-800 ring-amber-200",
  alerta: "bg-red-50 text-red-700 ring-red-200",
} as const;

export type Tono = keyof typeof tonos;

export function Insignia({
  tono = "neutro",
  className,
  ...props
}: ComponentProps<"span"> & { tono?: Tono }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tonos[tono],
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Traducción de estados a texto + color                                      */
/* -------------------------------------------------------------------------- */

export const ESTADO_EQUIPO: Record<string, { texto: string; tono: Tono }> = {
  disponible: { texto: "Disponible", tono: "exito" },
  reservado: { texto: "Reservado", tono: "atencion" },
  prestado: { texto: "Prestado", tono: "info" },
  mantencion: { texto: "En mantención", tono: "alerta" },
};

export const ESTADO_PRESTAMO: Record<string, { texto: string; tono: Tono }> = {
  pendiente: { texto: "Pendiente", tono: "atencion" },
  aprobado: { texto: "Aprobado", tono: "exito" },
  rechazado: { texto: "Rechazado", tono: "alerta" },
  devuelto: { texto: "Devuelto", tono: "neutro" },
};

export const ESTADO_SALIDA: Record<string, { texto: string; tono: Tono }> = {
  planificada: { texto: "Planificada", tono: "info" },
  en_curso: { texto: "En curso", tono: "atencion" },
  finalizada: { texto: "Finalizada", tono: "neutro" },
  cancelada: { texto: "Cancelada", tono: "alerta" },
};

export const ESTADO_CUOTA: Record<string, { texto: string; tono: Tono }> = {
  pendiente: { texto: "Pendiente", tono: "atencion" },
  pagado: { texto: "Pagada", tono: "exito" },
  parcial: { texto: "Pago parcial", tono: "info" },
};

export const DIFICULTAD: Record<string, { texto: string; tono: Tono }> = {
  facil: { texto: "Fácil", tono: "exito" },
  medio: { texto: "Media", tono: "info" },
  dificil: { texto: "Difícil", tono: "atencion" },
  experto: { texto: "Experto", tono: "alerta" },
};

export function InsigniaEstado({
  mapa,
  valor,
}: {
  mapa: Record<string, { texto: string; tono: Tono }>;
  valor: string;
}) {
  const entrada = mapa[valor] ?? { texto: valor, tono: "neutro" as Tono };
  return <Insignia tono={entrada.tono}>{entrada.texto}</Insignia>;
}

export const TIPO_ACTA: Record<string, { texto: string; tono: Tono }> = {
  asamblea_ordinaria: { texto: "Asamblea ordinaria", tono: "info" },
  asamblea_extraordinaria: { texto: "Asamblea extraordinaria", tono: "atencion" },
  directiva: { texto: "Reunión de directiva", tono: "neutro" },
};

export const ESTADO_ACTA: Record<string, { texto: string; tono: Tono }> = {
  borrador: { texto: "Borrador", tono: "atencion" },
  publicada: { texto: "Publicada", tono: "exito" },
};

export const ESTADO_REUNION: Record<string, { texto: string; tono: Tono }> = {
  convocada: { texto: "Convocada", tono: "info" },
  realizada: { texto: "Realizada", tono: "neutro" },
  cancelada: { texto: "Cancelada", tono: "alerta" },
};
