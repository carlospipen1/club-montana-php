"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  accionAgregarCertificacion,
  accionEliminarCertificacion,
  accionGuardarFicha,
} from "@/actions/ficha";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar, ConfirmarEnvio } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Input, Selector } from "@/components/ui/campos";
import { Insignia } from "@/components/ui/datos";
import {
  CERTIFICACIONES_SUGERIDAS,
  GRUPOS_SANGUINEOS,
  diasParaVencer,
} from "@/lib/ficha";
import { formatearFecha } from "@/lib/utils";
import type { Certificacion, FichaSocio } from "@/db/schema";

/**
 * La ficha médica, que llena cada socio.
 *
 * Todo es opcional a propósito: una ficha a medio llenar sirve más que una en
 * blanco, y exigirlo todo de una hace que nadie la abra. El grupo sanguíneo
 * solo ya vale el viaje.
 */
export function FormularioFicha({ ficha }: { ficha: FichaSocio | null }) {
  const [estado, accion] = useActionState(accionGuardarFicha, ESTADO_INICIAL);
  // Controlado para poder esconder "cuál" cuando la respuesta es Fonasa, donde
  // la pregunta no significa nada.
  const [prevision, setPrevision] = useState<string>(ficha?.prevision ?? "");

  return (
    <form action={accion} className="space-y-5 px-5 py-4" noValidate>
      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="grupoSanguineo"
          etiqueta="Grupo sanguíneo"
          error={estado.errores?.grupoSanguineo?.[0]}
        >
          <Selector
            id="grupoSanguineo"
            name="grupoSanguineo"
            defaultValue={estado.valores?.grupoSanguineo ?? ficha?.grupoSanguineo ?? ""}
          >
            <option value="">Sin indicar</option>
            {GRUPOS_SANGUINEOS.map((g) => (
              <option key={g.valor} value={g.valor}>
                {g.texto}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo id="prevision" etiqueta="Previsión de salud">
          <Selector
            id="prevision"
            name="prevision"
            value={prevision}
            onChange={(e) => setPrevision(e.target.value)}
          >
            <option value="">Sin indicar</option>
            <option value="fonasa">Fonasa</option>
            <option value="isapre">Isapre</option>
            <option value="otra">Otra</option>
          </Selector>
        </Campo>

        {prevision !== "" && prevision !== "fonasa" && (
          <Campo
            id="previsionDetalle"
            etiqueta="¿Cuál?"
            className="sm:col-span-2"
            error={estado.errores?.previsionDetalle?.[0]}
          >
            <Input
              id="previsionDetalle"
              name="previsionDetalle"
              defaultValue={
                estado.valores?.previsionDetalle ?? ficha?.previsionDetalle ?? ""
              }
              placeholder="Consalud, Banmédica…"
            />
          </Campo>
        )}
      </div>

      <Campo
        id="alergias"
        etiqueta="Alergias"
        ayuda="Medicamentos, picaduras, alimentos. Si no tienes, déjalo vacío."
        error={estado.errores?.alergias?.[0]}
      >
        <AreaTexto
          id="alergias"
          name="alergias"
          rows={2}
          defaultValue={estado.valores?.alergias ?? ficha?.alergias ?? ""}
          placeholder="Penicilina. Picadura de abeja (reacción fuerte)."
        />
      </Campo>

      <Campo
        id="condiciones"
        etiqueta="Condiciones médicas relevantes"
        ayuda="Asma, epilepsia, diabetes, algo cardíaco, mal de altura previo."
        error={estado.errores?.condiciones?.[0]}
      >
        <AreaTexto
          id="condiciones"
          name="condiciones"
          rows={2}
          defaultValue={estado.valores?.condiciones ?? ficha?.condiciones ?? ""}
        />
      </Campo>

      <Campo
        id="medicamentos"
        etiqueta="Medicamentos de uso habitual"
        error={estado.errores?.medicamentos?.[0]}
      >
        <AreaTexto
          id="medicamentos"
          name="medicamentos"
          rows={2}
          defaultValue={estado.valores?.medicamentos ?? ficha?.medicamentos ?? ""}
          placeholder="Salbutamol de rescate. Insulina."
        />
      </Campo>

      <fieldset className="grid gap-4 rounded-lg bg-stone-50 p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-medium text-stone-700">
          Seguro de rescate o asistencia
        </legend>
        <p className="text-xs text-stone-500 sm:col-span-2">
          Si tienes uno, acá. Es lo que se llama primero cuando hay que evacuar.
        </p>

        <Campo id="seguroCompania" etiqueta="Compañía">
          <Input
            id="seguroCompania"
            name="seguroCompania"
            defaultValue={estado.valores?.seguroCompania ?? ficha?.seguroCompania ?? ""}
          />
        </Campo>

        <Campo id="seguroPoliza" etiqueta="N.° de póliza">
          <Input
            id="seguroPoliza"
            name="seguroPoliza"
            defaultValue={estado.valores?.seguroPoliza ?? ficha?.seguroPoliza ?? ""}
          />
        </Campo>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {ficha?.actualizadaEn && (
          <p className="text-xs text-stone-400">
            Actualizada el {formatearFecha(ficha.actualizadaEn)}
          </p>
        )}
        <BotonEnviar className="ml-auto">Guardar ficha</BotonEnviar>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cursos y certificaciones                                                   */
/* -------------------------------------------------------------------------- */

export function Certificaciones({ lista }: { lista: Certificacion[] }) {
  const [estado, accion] = useActionState(accionAgregarCertificacion, ESTADO_INICIAL);
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-4 px-5 py-4">
      {lista.length === 0 ? (
        <p className="text-sm text-stone-500">
          Todavía no registras ningún curso. Si tienes primeros auxilios o algún curso
          de montaña, agrégalo: es lo que la comisión técnica mira al armar una salida.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
          {lista.map((c) => {
            const dias = diasParaVencer(c.fechaVencimiento);

            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900">{c.nombre}</p>
                  <p className="text-xs text-stone-500">
                    {c.institucion && <>{c.institucion} · </>}
                    {c.fechaObtencion
                      ? `Obtenido el ${formatearFecha(c.fechaObtencion)}`
                      : "Sin fecha de obtención"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {dias === null ? (
                    <span className="text-xs text-stone-400">No vence</span>
                  ) : dias < 0 ? (
                    <Insignia tono="alerta">
                      Venció el {formatearFecha(c.fechaVencimiento)}
                    </Insignia>
                  ) : dias <= 90 ? (
                    <Insignia tono="atencion">
                      Vence el {formatearFecha(c.fechaVencimiento)}
                    </Insignia>
                  ) : (
                    <Insignia tono="exito">
                      Vigente hasta el {formatearFecha(c.fechaVencimiento)}
                    </Insignia>
                  )}

                  <ConfirmarEnvio mensaje={`¿Quitar "${c.nombre}" de tu ficha?`}>
                    <form action={accionEliminarCertificacion}>
                      <input type="hidden" name="id" value={c.id} />
                      <Boton
                        type="submit"
                        variante="ghost"
                        tamano="sm"
                        className="text-red-700 hover:bg-red-50"
                        aria-label={`Quitar ${c.nombre}`}
                      >
                        <Trash2 aria-hidden />
                      </Boton>
                    </form>
                  </ConfirmarEnvio>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {abierto ? (
        <form
          action={accion}
          className="space-y-4 rounded-lg bg-stone-50 p-4"
          noValidate
        >
          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

          <Campo
            id="nombre"
            etiqueta="Curso o certificación"
            requerido
            error={estado.errores?.nombre?.[0]}
          >
            <Input
              id="nombre"
              name="nombre"
              list="cursos-sugeridos"
              defaultValue={estado.valores?.nombre}
              placeholder="WFA · Wilderness First Aid"
              required
            />
            {/* Sugerencias, no una lista cerrada: se puede escribir cualquier
                cosa, porque los cursos cambian de nombre más rápido que el
                código. */}
            <datalist id="cursos-sugeridos">
              {CERTIFICACIONES_SUGERIDAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>

          <Campo id="institucion" etiqueta="Institución">
            <Input
              id="institucion"
              name="institucion"
              defaultValue={estado.valores?.institucion}
              placeholder="ANDESCUELA, Cruz Roja, FEACH…"
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="fechaObtencion" etiqueta="Obtenido el">
              <Input
                id="fechaObtencion"
                name="fechaObtencion"
                type="date"
                defaultValue={estado.valores?.fechaObtencion}
              />
            </Campo>

            <Campo
              id="fechaVencimiento"
              etiqueta="Vence el"
              ayuda="Déjalo vacío si no vence."
              error={estado.errores?.fechaVencimiento?.[0]}
            >
              <Input
                id="fechaVencimiento"
                name="fechaVencimiento"
                type="date"
                defaultValue={estado.valores?.fechaVencimiento}
              />
            </Campo>
          </div>

          <div className="flex justify-end gap-2">
            <Boton type="button" variante="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
            <BotonEnviar>Agregar</BotonEnviar>
          </div>
        </form>
      ) : (
        <Boton variante="outline" tamano="sm" onClick={() => setAbierto(true)}>
          <Plus aria-hidden />
          Agregar un curso
        </Boton>
      )}
    </div>
  );
}
