"use client";

import { useActionState } from "react";

import { accionActualizarReunion, accionConvocarReunion } from "@/actions/reuniones";
import { ESTADO_INICIAL } from "@/actions/tipos";
import type { Reunion } from "@/db/schema";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { AreaTexto, Campo, Input, Selector } from "@/components/ui/campos";

const TIPOS = [
  { valor: "asamblea_ordinaria", texto: "Asamblea ordinaria" },
  { valor: "asamblea_extraordinaria", texto: "Asamblea extraordinaria" },
  { valor: "directiva", texto: "Reunión de directiva" },
];

/** Formato que espera un <input type="datetime-local">, en hora de Chile. */
function paraCampo(fecha: Date | string): string {
  const d = new Date(fecha);
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  // "sv-SE" entrega "2026-09-18 19:30"; el input lo quiere con T.
  return partes.replace(" ", "T");
}

export function FormularioReunion({ reunion }: { reunion?: Reunion }) {
  const [estado, accion] = useActionState(
    reunion ? accionActualizarReunion : accionConvocarReunion,
    ESTADO_INICIAL,
  );

  const v = estado.valores;
  const errores = estado.errores;

  return (
    <form action={accion} className="space-y-5" noValidate>
      {reunion && <input type="hidden" name="id" value={reunion.id} />}

      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <Campo id="tipo" etiqueta="Tipo de reunión" error={errores?.tipo?.[0]}>
        <Selector
          id="tipo"
          name="tipo"
          defaultValue={v?.tipo ?? reunion?.tipo ?? "asamblea_ordinaria"}
        >
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo
        id="titulo"
        etiqueta="Título"
        ayuda="Cómo se anuncia. Por ejemplo: Asamblea ordinaria de septiembre."
        error={errores?.titulo?.[0]}
      >
        <Input
          id="titulo"
          name="titulo"
          defaultValue={v?.titulo ?? reunion?.titulo ?? ""}
          maxLength={200}
        />
      </Campo>

      <Campo id="fechaHora" etiqueta="Fecha y hora" error={errores?.fechaHora?.[0]}>
        <Input
          id="fechaHora"
          name="fechaHora"
          type="datetime-local"
          defaultValue={v?.fechaHora ?? (reunion ? paraCampo(reunion.fechaHora) : "")}
        />
      </Campo>

      <Campo id="lugar" etiqueta="Lugar" error={errores?.lugar?.[0]}>
        <Input
          id="lugar"
          name="lugar"
          defaultValue={v?.lugar ?? reunion?.lugar ?? ""}
          placeholder="Sede del club, Collipulli"
          maxLength={200}
        />
      </Campo>

      <Campo
        id="tabla"
        etiqueta="Tabla"
        ayuda="Los puntos a tratar, uno por línea. Va tal cual en la convocatoria."
        error={errores?.tabla?.[0]}
      >
        <AreaTexto
          id="tabla"
          name="tabla"
          rows={6}
          defaultValue={v?.tabla ?? reunion?.tabla ?? ""}
          placeholder={
            "1. Balance del semestre.\n2. Calendario de salidas.\n3. Varios."
          }
        />
      </Campo>

      <div className="flex justify-end">
        <BotonEnviar>
          {reunion ? "Guardar cambios" : "Convocar y avisar al club"}
        </BotonEnviar>
      </div>
    </form>
  );
}
