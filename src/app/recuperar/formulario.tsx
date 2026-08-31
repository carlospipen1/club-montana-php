"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { accionSolicitarRecuperacion } from "@/actions/recuperacion";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Campo, Input } from "@/components/ui/campos";

export function FormularioSolicitud() {
  const [estado, accion] = useActionState(accionSolicitarRecuperacion, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-4" noValidate>
      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <Campo
        id="email"
        etiqueta="Correo electrónico"
        ayuda="El mismo con el que ingresas al sistema."
        requerido
        error={estado.errores?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={estado.valores?.email}
          placeholder="tu-correo@ejemplo.cl"
          required
          autoFocus
        />
      </Campo>

      <BotonEnviar cargando="Enviando…" className="w-full">
        <Send aria-hidden />
        Enviarme el enlace
      </BotonEnviar>

      <p className="text-center text-xs text-stone-500">
        ¿No tienes acceso a ese correo? La directiva puede generarte una contraseña
        temporal.
      </p>
    </form>
  );
}
