"use client";

import { useActionState } from "react";
import Link from "next/link";

import { accionActualizarActa, accionCrearActa } from "@/actions/actas";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { estiloBoton } from "@/components/ui/boton";
import { AreaTexto, Campo, Input, Selector } from "@/components/ui/campos";
import { hoyISO } from "@/lib/utils";
import type { Acta } from "@/db/schema";

export function FormularioActa({
  acta,
  numeroSugerido,
  anioSugerido,
  reunionId,
}: {
  acta?: Acta;
  numeroSugerido?: number;
  anioSugerido?: number;
  /**
   * La reunión de la que se deja constancia, cuando se llega desde ella. Si no
   * viene, la acción crea una con los datos del acta: toda acta pertenece a una
   * reunión, pero eso no puede costarle un paso extra a quien la redacta.
   */
  reunionId?: number;
}) {
  const editando = Boolean(acta);
  const [estado, accion] = useActionState(
    editando ? accionActualizarActa : accionCrearActa,
    ESTADO_INICIAL,
  );
  const v = estado.valores;

  return (
    <form action={accion} className="space-y-5" noValidate>
      {acta && <input type="hidden" name="id" value={acta.id} />}
      {!editando && reunionId && (
        <input type="hidden" name="reunionId" value={reunionId} />
      )}

      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Campo
          id="numero"
          etiqueta="Acta N°"
          requerido
          error={estado.errores?.numero?.[0]}
        >
          <Input
            id="numero"
            name="numero"
            type="number"
            min={1}
            className="tabular"
            defaultValue={v?.numero ?? acta?.numero ?? numeroSugerido}
            required
          />
        </Campo>

        <Campo id="anio" etiqueta="Año" requerido error={estado.errores?.anio?.[0]}>
          <Input
            id="anio"
            name="anio"
            type="number"
            min={1990}
            max={2100}
            className="tabular"
            defaultValue={v?.anio ?? acta?.anio ?? anioSugerido}
            required
          />
        </Campo>

        <Campo
          id="fecha"
          etiqueta="Fecha de la reunión"
          requerido
          error={estado.errores?.fecha?.[0]}
          className="sm:col-span-2"
        >
          <Input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={v?.fecha ?? acta?.fecha ?? hoyISO()}
            required
          />
        </Campo>

        <Campo id="tipo" etiqueta="Tipo de reunión" requerido className="sm:col-span-2">
          <Selector
            id="tipo"
            name="tipo"
            defaultValue={v?.tipo ?? acta?.tipo ?? "asamblea_ordinaria"}
          >
            <option value="asamblea_ordinaria">Asamblea ordinaria</option>
            <option value="asamblea_extraordinaria">Asamblea extraordinaria</option>
            <option value="directiva">Reunión de directiva</option>
          </Selector>
        </Campo>

        <Campo id="lugar" etiqueta="Lugar" className="sm:col-span-2">
          <Input
            id="lugar"
            name="lugar"
            defaultValue={v?.lugar ?? acta?.lugar ?? ""}
            placeholder="Sede del club, Collipulli"
          />
        </Campo>

        <Campo
          id="titulo"
          etiqueta="Título"
          requerido
          error={estado.errores?.titulo?.[0]}
          className="sm:col-span-4"
        >
          <Input
            id="titulo"
            name="titulo"
            defaultValue={v?.titulo ?? acta?.titulo}
            placeholder="Elección de directiva y calendario de salidas"
            required
          />
        </Campo>
      </div>

      <Campo
        id="cuerpo"
        etiqueta="Contenido del acta"
        ayuda="Texto libre: asistentes, temas tratados y acuerdos. Los saltos de línea se conservan."
        requerido
        error={estado.errores?.cuerpo?.[0]}
      >
        <AreaTexto
          id="cuerpo"
          name="cuerpo"
          rows={20}
          defaultValue={v?.cuerpo ?? acta?.cuerpo}
          placeholder={
            "Asistentes: ...\n\nTemas tratados:\n1. ...\n2. ...\n\nAcuerdos:\n- ..."
          }
          className="font-mono text-[0.8125rem] leading-relaxed"
          required
        />
      </Campo>

      <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-4">
        <Link
          href={acta ? `/panel/actas/${acta.id}` : "/panel/actas"}
          className={estiloBoton("ghost", "md")}
        >
          Cancelar
        </Link>
        <BotonEnviar cargando="Guardando…">
          {editando ? "Guardar cambios" : "Crear borrador"}
        </BotonEnviar>
      </div>

      {!editando && (
        <p className="text-right text-xs text-stone-500">
          Se guarda como borrador. Sólo tú y el administrador la verán hasta que la
          publiques.
        </p>
      )}
    </form>
  );
}
