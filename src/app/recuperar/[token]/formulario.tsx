"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { accionRestablecerPassword } from "@/actions/recuperacion";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Campo, Input } from "@/components/ui/campos";

export function FormularioNuevaPassword({ token }: { token: string }) {
  const [estado, accion] = useActionState(accionRestablecerPassword, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />

      {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

      <Campo
        id="nueva"
        etiqueta="Contraseña nueva"
        ayuda="Al menos 10 caracteres."
        requerido
        error={estado.errores?.nueva?.[0]}
      >
        <Input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          autoFocus
        />
      </Campo>

      <Campo
        id="confirmacion"
        etiqueta="Repite la contraseña"
        requerido
        error={estado.errores?.confirmacion?.[0]}
      >
        <Input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          required
        />
      </Campo>

      <BotonEnviar cargando="Guardando…" className="w-full">
        <KeyRound aria-hidden />
        Guardar contraseña
      </BotonEnviar>
    </form>
  );
}
