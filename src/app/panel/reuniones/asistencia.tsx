"use client";

import { useActionState, useState } from "react";

import { accionGuardarAsistencia } from "@/actions/reuniones";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";

type Socio = { id: number; nombre: string; presente: boolean };

/**
 * Pasa lista después de la reunión.
 *
 * No hay confirmación previa de los socios: en el club la asistencia la anota
 * quien redacta el acta, que es como se hacía en papel. Por eso esto son
 * casillas y no respuestas de cada persona.
 */
export function Asistencia({
  reunionId,
  socios,
}: {
  reunionId: number;
  socios: Socio[];
}) {
  const [estado, accion] = useActionState(accionGuardarAsistencia, ESTADO_INICIAL);

  // Firma de lo que dice el servidor. Sirve para detectar que llegaron datos
  // nuevos sin comparar conjuntos en cada render.
  const guardados = socios
    .filter((s) => s.presente)
    .map((s) => s.id)
    .join(",");

  const [marcados, setMarcados] = useState<Set<number>>(
    () => new Set(socios.filter((s) => s.presente).map((s) => s.id)),
  );
  const [ultimosGuardados, setUltimosGuardados] = useState(guardados);

  // Al terminar la acción, React 19 resetea el formulario y las casillas del
  // DOM quedan desmarcadas aunque la asistencia sí se haya guardado: parece que
  // falló cuando no falló. Se vuelve a tomar lo que devuelve el servidor, que
  // es la fuente de verdad. Se ajusta durante el render y no en un efecto, como
  // el resto de los formularios del panel.
  if (guardados !== ultimosGuardados) {
    setUltimosGuardados(guardados);
    setMarcados(new Set(socios.filter((s) => s.presente).map((s) => s.id)));
  }

  // Además hay que rehacer las casillas del DOM. El reseteo de React deja los
  // `checked` apagados sin que cambie el estado de React, así que React no las
  // vuelve a pintar y el DOM queda contradiciendo al resumen de arriba. Al
  // cambiar la `key`, la lista se remonta y se dibuja de nuevo desde el estado.
  const [version, setVersion] = useState(0);
  const [estadoPrevio, setEstadoPrevio] = useState(estado);

  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    setVersion((v) => v + 1);
  }

  function alternar(id: number) {
    setMarcados((previos) => {
      const copia = new Set(previos);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="reunionId" value={reunionId} />

      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          <span className="font-medium text-stone-900">{marcados.size}</span> de{" "}
          {socios.length} socios marcados como presentes.
        </p>
        <div className="flex gap-2">
          <Boton
            type="button"
            variante="ghost"
            tamano="sm"
            onClick={() => setMarcados(new Set(socios.map((s) => s.id)))}
          >
            Marcar todos
          </Boton>
          <Boton
            type="button"
            variante="ghost"
            tamano="sm"
            onClick={() => setMarcados(new Set())}
          >
            Limpiar
          </Boton>
        </div>
      </div>

      <ul key={version} className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {socios.map((socio) => (
          <li key={socio.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-stone-50">
              <input
                type="checkbox"
                name="asistente"
                value={socio.id}
                checked={marcados.has(socio.id)}
                onChange={() => alternar(socio.id)}
                className="text-brand-700 focus:ring-brand-600 size-4 rounded border-stone-300"
              />
              <span className="text-sm text-stone-700">{socio.nombre}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <BotonEnviar>Guardar asistencia</BotonEnviar>
      </div>
    </form>
  );
}
