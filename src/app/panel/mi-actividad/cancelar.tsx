"use client";

import { X } from "lucide-react";

import { accionCancelarSolicitud } from "@/actions/equipos";
import { BotonEnviar, Modal } from "@/components/ui/acciones";
import { useModalAccion } from "@/components/ui/usar-modal-accion";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";

/**
 * Retirar un pedido que nadie respondió todavía.
 *
 * Va con confirmación y no como un botón suelto porque no se deshace: para
 * volver atrás hay que pedir el equipo de nuevo, y en el intermedio alguien
 * puede haberlo tomado.
 */
export function CancelarSolicitud({
  solicitudId,
  pendientes,
}: {
  solicitudId: number;
  pendientes: number;
}) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionCancelarSolicitud);

  return (
    <>
      <Boton variante="ghost" tamano="sm" onClick={abrir}>
        <X aria-hidden />
        Cancelar pedido
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Cancelar el pedido"
        descripcion="Los equipos vuelven a quedar libres en esas fechas y quien los lleva recibe el aviso."
        ancho="sm"
      >
        <form action={accion} className="space-y-4" noValidate>
          <input type="hidden" name="solicitudId" value={solicitudId} />

          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

          <p className="text-sm text-stone-700">
            Se retiran{" "}
            <span className="font-medium text-stone-900">
              {pendientes === 1 ? "el equipo" : `los ${pendientes} equipos`}
            </span>{" "}
            que siguen esperando respuesta. Si después lo necesitas, tendrás que
            pedirlo de nuevo.
          </p>

          <div className="flex justify-end gap-2">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Mejor no
            </Boton>
            <BotonEnviar variante="danger" cargando="Cancelando…">
              Sí, cancelar
            </BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}
