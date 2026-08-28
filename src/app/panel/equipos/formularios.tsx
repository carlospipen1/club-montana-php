"use client";

import { Pencil, Plus, Send } from "lucide-react";

import {
  accionActualizarEquipo,
  accionCrearEquipo,
  accionSolicitarPrestamo,
} from "@/actions/equipos";
import type { EstadoFormulario } from "@/actions/tipos";
import { BotonEnviar, Modal } from "@/components/ui/acciones";
import { useModalAccion } from "@/components/ui/usar-modal-accion";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Input, Selector } from "@/components/ui/campos";
import { CATEGORIAS_EQUIPO } from "@/lib/equipos";
import { hoyISO } from "@/lib/utils";
import type { Equipo } from "@/db/schema";

function CamposEquipo({
  equipo,
  errores,
  valores,
}: {
  equipo?: Equipo;
  errores?: EstadoFormulario["errores"];
  valores?: EstadoFormulario["valores"];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo
        id="nombre"
        etiqueta="Nombre"
        requerido
        error={errores?.nombre?.[0]}
        className="sm:col-span-2"
      >
        <Input
          id="nombre"
          name="nombre"
          defaultValue={valores?.nombre ?? equipo?.nombre}
          placeholder="Carpa Doite Himalaya 3p"
          required
        />
      </Campo>

      <Campo
        id="categoria"
        etiqueta="Categoría"
        requerido
        error={errores?.categoria?.[0]}
      >
        <Selector
          id="categoria"
          name="categoria"
          defaultValue={valores?.categoria ?? equipo?.categoria}
          required
        >
          {CATEGORIAS_EQUIPO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo id="estado" etiqueta="Estado" requerido>
        <Selector
          id="estado"
          name="estado"
          defaultValue={valores?.estado ?? equipo?.estado ?? "disponible"}
        >
          <option value="disponible">Disponible</option>
          <option value="reservado">Reservado</option>
          <option value="prestado">Prestado</option>
          <option value="mantencion">En mantención</option>
        </Selector>
      </Campo>

      <Campo
        id="fechaAdquisicion"
        etiqueta="Fecha de adquisición"
        className="sm:col-span-2"
      >
        <Input
          id="fechaAdquisicion"
          name="fechaAdquisicion"
          type="date"
          defaultValue={
            valores?.fechaAdquisicion ?? equipo?.fechaAdquisicion ?? hoyISO()
          }
        />
      </Campo>

      <Campo
        id="descripcion"
        etiqueta="Descripción"
        ayuda="Estado de conservación, número de serie, detalles útiles."
        className="sm:col-span-2"
      >
        <AreaTexto
          id="descripcion"
          name="descripcion"
          defaultValue={valores?.descripcion ?? equipo?.descripcion ?? ""}
        />
      </Campo>
    </div>
  );
}

export function NuevoEquipo() {
  const { abierto, abrir, cerrar, estado, accion } = useModalAccion(accionCrearEquipo);

  return (
    <>
      <Boton onClick={abrir}>
        <Plus aria-hidden />
        Agregar equipo
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Agregar equipo al inventario"
        ancho="lg"
      >
        <form action={accion} className="space-y-5" noValidate>
          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}
          <CamposEquipo errores={estado.errores} valores={estado.valores} />
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Cancelar
            </Boton>
            <BotonEnviar>Agregar</BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditarEquipo({ equipo }: { equipo: Equipo }) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionActualizarEquipo);

  return (
    <>
      <Boton
        variante="ghost"
        tamano="sm"
        onClick={abrir}
        aria-label={`Editar ${equipo.nombre}`}
      >
        <Pencil aria-hidden />
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={`Editar ${equipo.nombre}`}
        ancho="lg"
      >
        <form action={accion} className="space-y-5" noValidate>
          <input type="hidden" name="id" value={equipo.id} />
          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}
          <CamposEquipo
            equipo={equipo}
            errores={estado.errores}
            valores={estado.valores}
          />
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Cancelar
            </Boton>
            <BotonEnviar>Guardar</BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function SolicitarPrestamo({ equipo }: { equipo: Equipo }) {
  const { abierto, abrir, cerrar, estado, accion } = useModalAccion(
    accionSolicitarPrestamo,
    {
      cerrarAlExito: false,
    },
  );

  return (
    <>
      <Boton variante="outline" tamano="sm" onClick={abrir}>
        <Send aria-hidden />
        Solicitar
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={`Solicitar ${equipo.nombre}`}
        descripcion="La directiva revisará tu solicitud y te avisará por notificación."
      >
        {estado.ok ? (
          <div className="space-y-4">
            <Aviso tono="exito">{estado.mensaje}</Aviso>
            <div className="flex justify-end">
              <Boton variante="outline" onClick={cerrar}>
                Listo
              </Boton>
            </div>
          </div>
        ) : (
          <form action={accion} className="space-y-4" noValidate>
            <input type="hidden" name="equipoId" value={equipo.id} />

            {estado.mensaje && <Aviso tono="error">{estado.mensaje}</Aviso>}

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="fechaDesde"
                etiqueta="Lo retiro el"
                requerido
                error={estado.errores?.fechaDesde?.[0]}
              >
                <Input
                  id="fechaDesde"
                  name="fechaDesde"
                  type="date"
                  min={hoyISO()}
                  defaultValue={estado.valores?.fechaDesde ?? hoyISO()}
                  required
                />
              </Campo>

              <Campo
                id="fechaHasta"
                etiqueta="Lo devuelvo el"
                requerido
                error={estado.errores?.fechaHasta?.[0]}
              >
                <Input
                  id="fechaHasta"
                  name="fechaHasta"
                  type="date"
                  min={hoyISO()}
                  defaultValue={estado.valores?.fechaHasta}
                  required
                />
              </Campo>
            </div>

            <Campo
              id="motivo"
              etiqueta="¿Para qué lo necesitas?"
              requerido
              error={estado.errores?.motivo?.[0]}
            >
              <AreaTexto
                id="motivo"
                name="motivo"
                defaultValue={estado.valores?.motivo}
                placeholder="Salida al Cerro El Manzano el fin de semana."
                required
              />
            </Campo>

            <div className="flex justify-end gap-2">
              <Boton type="button" variante="ghost" onClick={cerrar}>
                Cancelar
              </Boton>
              <BotonEnviar cargando="Enviando…">Enviar solicitud</BotonEnviar>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
