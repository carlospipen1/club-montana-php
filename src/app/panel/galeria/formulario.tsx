"use client";

import { useActionState } from "react";
import Link from "next/link";

import { accionActualizarAlbum, accionCrearAlbum } from "@/actions/galeria";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { estiloBoton } from "@/components/ui/boton";
import { AreaTexto, Campo, Input } from "@/components/ui/campos";
import { hoyISO } from "@/lib/utils";
import type { Album } from "@/db/schema";

export function FormularioAlbum({ album }: { album?: Album }) {
  const editando = Boolean(album);
  const [estado, accion] = useActionState(
    editando ? accionActualizarAlbum : accionCrearAlbum,
    ESTADO_INICIAL,
  );
  const v = estado.valores;

  return (
    <form action={accion} className="space-y-5" noValidate>
      {album && <input type="hidden" name="id" value={album.id} />}

      {estado.mensaje && (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          id="titulo"
          etiqueta="Título del álbum"
          requerido
          error={estado.errores?.titulo?.[0]}
          className="sm:col-span-3"
        >
          <Input
            id="titulo"
            name="titulo"
            defaultValue={v?.titulo ?? album?.titulo}
            placeholder="Cumbre del Lonquimay"
            required
          />
        </Campo>

        <Campo
          id="fecha"
          etiqueta="Fecha de la salida"
          requerido
          error={estado.errores?.fecha?.[0]}
        >
          <Input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={v?.fecha ?? album?.fecha ?? hoyISO()}
            required
          />
        </Campo>

        <Campo id="lugar" etiqueta="Lugar" className="sm:col-span-2">
          <Input
            id="lugar"
            name="lugar"
            defaultValue={v?.lugar ?? album?.lugar ?? ""}
            placeholder="Volcán Lonquimay, Región de La Araucanía"
          />
        </Campo>

        <Campo
          id="descripcion"
          etiqueta="Descripción"
          ayuda="Un par de líneas sobre la salida. Aparece bajo el título en la galería."
          className="sm:col-span-3"
        >
          <AreaTexto
            id="descripcion"
            name="descripcion"
            rows={3}
            defaultValue={v?.descripcion ?? album?.descripcion ?? ""}
          />
        </Campo>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-4">
        <Link
          href={album ? `/panel/galeria/${album.id}` : "/panel/galeria"}
          className={estiloBoton("ghost", "md")}
        >
          Cancelar
        </Link>
        <BotonEnviar cargando="Guardando…">
          {editando ? "Guardar cambios" : "Crear álbum y subir fotos"}
        </BotonEnviar>
      </div>
    </form>
  );
}
