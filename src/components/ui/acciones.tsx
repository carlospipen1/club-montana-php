"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Boton, type Tamano, type Variante } from "./boton";
import { cn } from "@/lib/utils";

/**
 * Botón de envío que se deshabilita solo mientras la acción está en vuelo.
 * Evita el doble envío accidental, que en el sistema anterior podía duplicar
 * una inscripción o un pago.
 */
export function BotonEnviar({
  children,
  cargando,
  variante = "primary",
  tamano = "md",
  className,
  ...props
}: {
  children: ReactNode;
  cargando?: string;
  variante?: Variante;
  tamano?: Tamano;
  className?: string;
} & Omit<React.ComponentProps<"button">, "children">) {
  const { pending } = useFormStatus();

  return (
    <Boton
      type="submit"
      variante={variante}
      tamano={tamano}
      disabled={pending}
      aria-busy={pending}
      className={className}
      {...props}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? (cargando ?? "Guardando…") : children}
    </Boton>
  );
}

/**
 * Diálogo modal sobre el <dialog> nativo: trampa de foco, cierre con Escape y
 * fondo inerte los pone el navegador, sin necesidad de una librería extra.
 */
export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  ancho = "md",
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  ancho?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  const anchos = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => {
        // Cerrar al hacer clic fuera del contenido.
        if (e.target === ref.current) onCerrar();
      }}
      className={cn(
        "w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-0 shadow-xl backdrop:bg-stone-900/40",
        "open:animate-in m-auto",
        anchos[ancho],
      )}
    >
      <div className="border-b border-stone-200 px-5 py-4">
        <h2 className="font-semibold text-stone-900">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-stone-500">{descripcion}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}

/** Botón que abre un modal, con el estado ya manejado. */
export function ModalDisparador({
  etiqueta,
  titulo,
  descripcion,
  children,
  variante = "primary",
  tamano = "md",
  icono,
  ancho,
}: {
  etiqueta: string;
  titulo: string;
  descripcion?: string;
  children: (cerrar: () => void) => ReactNode;
  variante?: Variante;
  tamano?: Tamano;
  icono?: ReactNode;
  ancho?: "sm" | "md" | "lg";
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  return (
    <>
      <Boton variante={variante} tamano={tamano} onClick={() => setAbierto(true)}>
        {icono}
        {etiqueta}
      </Boton>
      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={titulo}
        descripcion={descripcion}
        ancho={ancho}
      >
        {children(cerrar)}
      </Modal>
    </>
  );
}

/**
 * Envuelve una acción destructiva para que pida confirmación antes de enviarse.
 */
export function ConfirmarEnvio({
  mensaje,
  children,
}: {
  mensaje: string;
  children: ReactNode;
}) {
  return (
    <span
      onClickCapture={(e) => {
        if (!window.confirm(mensaje)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}
    </span>
  );
}
