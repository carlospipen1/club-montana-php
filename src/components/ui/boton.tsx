import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const variantes = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "bg-stone-900 text-white hover:bg-stone-800",
  outline: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
  ghost: "text-stone-700 hover:bg-stone-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dangerOutline: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
} as const;

const tamanos = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
} as const;

export type Variante = keyof typeof variantes;
export type Tamano = keyof typeof tamanos;

export function estiloBoton(variante: Variante = "primary", tamano: Tamano = "md") {
  return cn(base, variantes[variante], tamanos[tamano]);
}

type BotonProps = ComponentProps<"button"> & {
  variante?: Variante;
  tamano?: Tamano;
};

export function Boton({
  variante = "primary",
  tamano = "md",
  className,
  ...props
}: BotonProps) {
  return <button className={cn(estiloBoton(variante, tamano), className)} {...props} />;
}

type BotonEnlaceProps = ComponentProps<typeof Link> & {
  variante?: Variante;
  tamano?: Tamano;
};

export function BotonEnlace({
  variante = "primary",
  tamano = "md",
  className,
  ...props
}: BotonEnlaceProps) {
  return <Link className={cn(estiloBoton(variante, tamano), className)} {...props} />;
}
