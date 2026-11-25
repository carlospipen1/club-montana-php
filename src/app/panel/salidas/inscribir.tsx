"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { accionInscribirSocio } from "@/actions/salidas";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Selector } from "@/components/ui/campos";

/**
 * Agregar a la lista a alguien que confirmó por fuera del sistema.
 *
 * Va dentro del detalle de participantes y no en un modal aparte: quien arma la
 * nómina está mirando justamente esa lista, y abrir una ventana para cada
 * persona que confirmó por WhatsApp sería diez ventanas.
 */
export function InscribirSocio({
  salidaId,
  candidatos,
}: {
  salidaId: number;
  /** Socios activos que todavía no están en esta salida. */
  candidatos: { id: number; nombre: string }[];
}) {
  const [estado, accion] = useActionState(accionInscribirSocio, ESTADO_INICIAL);

  if (candidatos.length === 0) {
    return (
      <p className="mt-3 text-xs text-stone-500">
        Todos los socios activos ya están inscritos.
      </p>
    );
  }

  return (
    <form action={accion} className="mt-3 space-y-2">
      <input type="hidden" name="salidaId" value={salidaId} />

      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`socio-${salidaId}`} className="sr-only">
          Socio a inscribir
        </label>
        <Selector
          id={`socio-${salidaId}`}
          name="usuarioId"
          defaultValue=""
          className="h-8 w-auto min-w-56 py-0 text-xs"
        >
          <option value="">Agregar a alguien que confirmó…</option>
          {candidatos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>

        <BotonEnviar variante="outline" tamano="sm" className="h-8 text-xs">
          <UserPlus aria-hidden />
          Inscribir
        </BotonEnviar>
      </div>

      {estado.errores?.usuarioId?.[0] && (
        <p className="text-xs text-red-700">{estado.errores.usuarioId[0]}</p>
      )}
    </form>
  );
}
