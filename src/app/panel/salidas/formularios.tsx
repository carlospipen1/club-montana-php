"use client";

import { useActionState } from "react";
import { CalendarPlus, Pencil, UserPlus } from "lucide-react";

import {
  accionActualizarSalida,
  accionCrearSalida,
  accionInscribirse,
} from "@/actions/salidas";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/actions/tipos";
import { BotonEnviar, Modal } from "@/components/ui/acciones";
import { useModalAccion } from "@/components/ui/usar-modal-accion";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Input, Selector } from "@/components/ui/campos";
import { paraInputFechaHora } from "@/lib/utils";
import type { Salida } from "@/db/schema";

function CamposSalida({
  salida,
  errores,
  valores,
}: {
  salida?: Salida;
  errores?: EstadoFormulario["errores"];
  valores?: EstadoFormulario["valores"];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo
        id="nombre"
        etiqueta="Nombre de la salida"
        requerido
        error={errores?.nombre?.[0]}
        className="sm:col-span-2"
      >
        <Input
          id="nombre"
          name="nombre"
          defaultValue={valores?.nombre ?? salida?.nombre}
          placeholder="Ascenso al Cerro Colorado"
          required
        />
      </Campo>

      <Campo id="lugar" etiqueta="Lugar" className="sm:col-span-2">
        <Input
          id="lugar"
          name="lugar"
          defaultValue={valores?.lugar ?? salida?.lugar ?? ""}
          placeholder="Parque Nacional Tolhuaca, Región de La Araucanía"
        />
      </Campo>

      <Campo
        id="fechaSalida"
        etiqueta="Fecha y hora de salida"
        requerido
        error={errores?.fechaSalida?.[0]}
      >
        <Input
          id="fechaSalida"
          name="fechaSalida"
          type="datetime-local"
          defaultValue={
            valores?.fechaSalida ?? paraInputFechaHora(salida?.fechaSalida ?? null)
          }
          required
        />
      </Campo>

      <Campo
        id="fechaLimiteInscripcion"
        etiqueta="Cierre de inscripciones"
        requerido
        error={errores?.fechaLimiteInscripcion?.[0]}
      >
        <Input
          id="fechaLimiteInscripcion"
          name="fechaLimiteInscripcion"
          type="datetime-local"
          defaultValue={
            valores?.fechaLimiteInscripcion ??
            paraInputFechaHora(salida?.fechaLimiteInscripcion ?? null)
          }
          required
        />
      </Campo>

      <Campo id="nivelDificultad" etiqueta="Dificultad" requerido>
        <Selector
          id="nivelDificultad"
          name="nivelDificultad"
          defaultValue={valores?.nivelDificultad ?? salida?.nivelDificultad ?? "medio"}
        >
          <option value="facil">Fácil</option>
          <option value="medio">Media</option>
          <option value="dificil">Difícil</option>
          <option value="experto">Experto</option>
        </Selector>
      </Campo>

      <Campo
        id="cupoMaximo"
        etiqueta="Cupos"
        requerido
        error={errores?.cupoMaximo?.[0]}
      >
        <Input
          id="cupoMaximo"
          name="cupoMaximo"
          type="number"
          min={1}
          max={500}
          defaultValue={valores?.cupoMaximo ?? salida?.cupoMaximo ?? 20}
          required
        />
      </Campo>

      <Campo
        id="descripcion"
        etiqueta="Descripción"
        ayuda="Ruta, desnivel, punto de encuentro, costo aproximado."
        className="sm:col-span-2"
      >
        <AreaTexto
          id="descripcion"
          name="descripcion"
          defaultValue={valores?.descripcion ?? salida?.descripcion ?? ""}
        />
      </Campo>

      <Campo
        id="equipoRequerido"
        etiqueta="Equipo requerido"
        ayuda="Qué debe llevar cada participante."
        className="sm:col-span-2"
      >
        <AreaTexto
          id="equipoRequerido"
          name="equipoRequerido"
          rows={3}
          defaultValue={valores?.equipoRequerido ?? salida?.equipoRequerido ?? ""}
          placeholder="Bototos de trekking, cortaviento, 2 L de agua, linterna frontal."
        />
      </Campo>
    </div>
  );
}

export function NuevaSalida() {
  const { abierto, abrir, cerrar, estado, accion } = useModalAccion(accionCrearSalida);

  return (
    <>
      <Boton onClick={abrir}>
        <CalendarPlus aria-hidden />
        Nueva salida
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Programar una salida"
        descripcion="Se avisará por notificación a todos los socios activos."
        ancho="lg"
      >
        <form action={accion} className="space-y-5" noValidate>
          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}
          <CamposSalida errores={estado.errores} valores={estado.valores} />
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Cancelar
            </Boton>
            <BotonEnviar cargando="Publicando…">Publicar salida</BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditarSalida({ salida }: { salida: Salida }) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionActualizarSalida);

  return (
    <>
      <Boton variante="ghost" tamano="sm" onClick={abrir}>
        <Pencil aria-hidden />
        Editar
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={`Editar "${salida.nombre}"`}
        ancho="lg"
      >
        <form action={accion} className="space-y-5" noValidate>
          <input type="hidden" name="id" value={salida.id} />
          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}
          <CamposSalida
            salida={salida}
            errores={estado.errores}
            valores={estado.valores}
          />
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Cancelar
            </Boton>
            <BotonEnviar>Guardar cambios</BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function Inscribirse({
  salidaId,
  nombre,
  deshabilitado,
  motivo,
}: {
  salidaId: number;
  nombre: string;
  deshabilitado?: boolean;
  motivo?: string;
}) {
  const [estado, accion] = useActionState(accionInscribirse, ESTADO_INICIAL);

  if (deshabilitado) {
    return (
      <span className="text-sm text-stone-500">
        {motivo ?? "Inscripciones cerradas"}
      </span>
    );
  }

  return (
    <form action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="salidaId" value={salidaId} />
      <BotonEnviar tamano="sm" cargando="Inscribiendo…">
        <UserPlus aria-hidden />
        Inscribirme
      </BotonEnviar>
      {estado.mensaje && !estado.ok && (
        <span className="text-xs font-medium text-red-700">{estado.mensaje}</span>
      )}
      <span className="sr-only">{nombre}</span>
    </form>
  );
}
