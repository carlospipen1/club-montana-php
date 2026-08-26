import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tonos = {
  info: { clase: "bg-brand-50 text-brand-900 ring-brand-200", Icono: Info },
  exito: {
    clase: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    Icono: CheckCircle2,
  },
  atencion: {
    clase: "bg-amber-50 text-amber-900 ring-amber-200",
    Icono: AlertTriangle,
  },
  error: { clase: "bg-red-50 text-red-900 ring-red-200", Icono: XCircle },
} as const;

export function Aviso({
  tono = "info",
  titulo,
  children,
  className,
}: {
  tono?: keyof typeof tonos;
  titulo?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { clase, Icono } = tonos[tono];

  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset",
        clase,
        className,
      )}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && <div className="text-[0.8125rem] opacity-90">{children}</div>}
      </div>
    </div>
  );
}
