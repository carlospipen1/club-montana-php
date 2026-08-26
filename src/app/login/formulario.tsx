"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { accionLogin } from "@/actions/auth";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Campo, Input } from "@/components/ui/campos";

export function FormularioLogin({ siguiente }: { siguiente?: string }) {
  const [estado, accion] = useActionState(accionLogin, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-4" noValidate>
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}

      {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

      <Campo
        id="email"
        etiqueta="Correo electrónico"
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

      <Campo
        id="password"
        etiqueta="Contraseña"
        requerido
        error={estado.errores?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Campo>

      <BotonEnviar cargando="Ingresando…" className="w-full">
        <LogIn aria-hidden />
        Ingresar
      </BotonEnviar>
    </form>
  );
}
