"use client";

import { useActionState } from "react";

import { accionCambiarPassword } from "@/actions/auth";
import { accionActualizarPerfil } from "@/actions/perfil";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Campo, Input } from "@/components/ui/campos";
import type { Usuario } from "@/db/schema";

export function FormularioContacto({ usuario }: { usuario: Usuario }) {
  const [estado, accion] = useActionState(accionActualizarPerfil, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-5 px-5 py-4" noValidate>
      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <Campo id="telefono" etiqueta="Mi teléfono" error={estado.errores?.telefono?.[0]}>
        <Input
          id="telefono"
          name="telefono"
          type="tel"
          defaultValue={estado.valores?.telefono ?? usuario.telefono ?? ""}
          placeholder="+56 9 1234 5678"
        />
      </Campo>

      <fieldset className="space-y-4 rounded-lg bg-amber-50/60 p-4 ring-1 ring-amber-200 ring-inset">
        <legend className="px-1 text-sm font-medium text-amber-900">
          Contacto de emergencia
        </legend>
        <p className="text-xs text-amber-900/80">
          Es el dato que el encargado de una salida usará si algo pasa en el cerro.
          Mantenlo al día.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="contactoNombre"
            etiqueta="Nombre"
            className="sm:col-span-2"
            error={estado.errores?.contactoNombre?.[0]}
          >
            <Input
              id="contactoNombre"
              name="contactoNombre"
              defaultValue={
                estado.valores?.contactoNombre ?? usuario.contactoEmergenciaNombre ?? ""
              }
            />
          </Campo>

          <Campo
            id="contactoTelefono"
            etiqueta="Teléfono"
            error={estado.errores?.contactoTelefono?.[0]}
          >
            <Input
              id="contactoTelefono"
              name="contactoTelefono"
              type="tel"
              defaultValue={
                estado.valores?.contactoTelefono ??
                usuario.contactoEmergenciaTelefono ??
                ""
              }
            />
          </Campo>

          <Campo
            id="contactoRelacion"
            etiqueta="Relación"
            error={estado.errores?.contactoRelacion?.[0]}
          >
            <Input
              id="contactoRelacion"
              name="contactoRelacion"
              defaultValue={
                estado.valores?.contactoRelacion ??
                usuario.contactoEmergenciaRelacion ??
                ""
              }
              placeholder="Madre, pareja, hermano…"
            />
          </Campo>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <BotonEnviar>Guardar cambios</BotonEnviar>
      </div>
    </form>
  );
}

export function FormularioPassword({ temporal }: { temporal: boolean }) {
  const [estado, accion] = useActionState(accionCambiarPassword, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-4 px-5 py-4" noValidate>
      {temporal && !estado.ok && (
        <Aviso tono="atencion" titulo="Estás usando una contraseña temporal">
          La generó la directiva. Cámbiala por una tuya.
        </Aviso>
      )}

      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <Campo
        id="actual"
        etiqueta="Contraseña actual"
        requerido
        error={estado.errores?.actual?.[0]}
      >
        <Input
          id="actual"
          name="actual"
          type="password"
          autoComplete="current-password"
          required
        />
      </Campo>

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
        />
      </Campo>

      <Campo
        id="confirmacion"
        etiqueta="Repite la contraseña nueva"
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

      <div className="flex justify-end">
        <BotonEnviar cargando="Actualizando…">Cambiar contraseña</BotonEnviar>
      </div>
    </form>
  );
}
