"use client";

import { Pencil, Plus } from "lucide-react";

import { accionActualizarEquipo, accionCrearEquipo } from "@/actions/equipos";
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

      {/* Sólo la condición física. "Prestado" y "reservado" salieron de acá: no
          son algo que alguien marque a mano, son consecuencia de los préstamos
          y de sus fechas, y el listado los muestra deducidos. */}
      <Campo
        id="estado"
        etiqueta="Condición"
        requerido
        ayuda="Si está prestado no se marca acá: lo dicen sus préstamos."
      >
        <Selector
          id="estado"
          name="estado"
          defaultValue={
            valores?.estado ??
            (equipo?.estado === "mantencion" ? "mantencion" : "disponible")
          }
        >
          <option value="disponible">Disponible</option>
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
