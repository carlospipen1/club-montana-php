"use client";

import { Check, PackageCheck, X } from "lucide-react";

import { accionResolverPrestamo, accionResolverSolicitud } from "@/actions/equipos";
import { BotonEnviar, Modal } from "@/components/ui/acciones";
import { useModalAccion } from "@/components/ui/usar-modal-accion";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo } from "@/components/ui/campos";

type Decision = "aprobado" | "rechazado" | "devuelto";

const TEXTOS: Record<
  Decision,
  { etiqueta: string; titulo: string; descripcion: string; confirmar: string }
> = {
  aprobado: {
    etiqueta: "Aprobar",
    titulo: "Aprobar préstamo",
    descripcion: "El equipo quedará marcado como prestado hasta que se devuelva.",
    confirmar: "Aprobar préstamo",
  },
  rechazado: {
    etiqueta: "Rechazar",
    titulo: "Rechazar solicitud",
    descripcion: "El socio recibirá una notificación con el motivo que escribas.",
    confirmar: "Rechazar solicitud",
  },
  devuelto: {
    etiqueta: "Marcar devuelto",
    titulo: "Registrar devolución",
    descripcion: "El equipo volverá a quedar disponible para otros socios.",
    confirmar: "Registrar devolución",
  },
};

export function ResolverPrestamo({
  prestamoId,
  decision,
  resumen,
}: {
  prestamoId: number;
  decision: Decision;
  resumen: string;
}) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionResolverPrestamo);

  const t = TEXTOS[decision];
  const Icono =
    decision === "aprobado" ? Check : decision === "rechazado" ? X : PackageCheck;

  return (
    <>
      <Boton
        variante={
          decision === "aprobado"
            ? "primary"
            : decision === "rechazado"
              ? "dangerOutline"
              : "outline"
        }
        tamano="sm"
        onClick={abrir}
      >
        <Icono aria-hidden />
        {t.etiqueta}
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={t.titulo}
        descripcion={t.descripcion}
      >
        <form action={accion} className="space-y-4" noValidate>
          <input type="hidden" name="prestamoId" value={prestamoId} />
          <input type="hidden" name="decision" value={decision} />

          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

          <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {resumen}
          </p>

          <Campo
            id={`nota-${prestamoId}-${decision}`}
            etiqueta={decision === "rechazado" ? "Motivo" : "Nota (opcional)"}
            ayuda="Queda registrado y le llega al socio."
          >
            <AreaTexto
              id={`nota-${prestamoId}-${decision}`}
              name="nota"
              rows={3}
              placeholder={
                decision === "rechazado"
                  ? "El equipo ya está comprometido para esa fecha."
                  : ""
              }
            />
          </Campo>

          <div className="flex justify-end gap-2">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Cancelar
            </Boton>
            <BotonEnviar variante={decision === "rechazado" ? "danger" : "primary"}>
              {t.confirmar}
            </BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}

const TEXTOS_TODO: Record<
  Decision,
  { etiqueta: string; titulo: string; descripcion: string; confirmar: string }
> = {
  aprobado: {
    etiqueta: "Aprobar todo",
    titulo: "Aprobar el pedido completo",
    descripcion:
      "Se aprueba todo lo que siga pendiente. Lo que ya resolviste no se toca.",
    confirmar: "Aprobar todo",
  },
  rechazado: {
    etiqueta: "Rechazar todo",
    titulo: "Rechazar el pedido completo",
    descripcion: "Se rechaza todo lo que siga pendiente, con el motivo que escribas.",
    confirmar: "Rechazar todo",
  },
  devuelto: {
    etiqueta: "Devolver todo",
    titulo: "Registrar la devolución completa",
    descripcion: "Todos esos equipos vuelven a quedar disponibles.",
    confirmar: "Registrar devolución",
  },
};

/**
 * La misma decisión para todo el pedido.
 *
 * Es el camino corto del caso normal —está todo, se presta todo— y convive con
 * los botones de cada equipo: quien resuelve usa uno u otro según le acomode.
 * Sólo aparece cuando hay más de una cosa que resolver; con una sola, los
 * botones de la fila hacen exactamente lo mismo.
 */
export function ResolverSolicitud({
  solicitudId,
  decision,
  resumen,
  cuantos,
}: {
  solicitudId: number;
  decision: Decision;
  resumen: string;
  /** Cuántos equipos alcanza la decisión, para que el botón no mienta. */
  cuantos: number;
}) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionResolverSolicitud);

  const t = TEXTOS_TODO[decision];
  // "Aprobar todo" sobre una sola cosa suena raro y además preocupa: parece que
  // va a tocar más de lo que toca.
  const etiqueta = cuantos === 1 ? TEXTOS[decision].etiqueta : `${t.etiqueta} (${cuantos})`;
  const Icono =
    decision === "aprobado" ? Check : decision === "rechazado" ? X : PackageCheck;

  return (
    <>
      <Boton
        variante={
          decision === "aprobado"
            ? "primary"
            : decision === "rechazado"
              ? "dangerOutline"
              : "outline"
        }
        tamano="sm"
        onClick={abrir}
      >
        <Icono aria-hidden />
        {etiqueta}
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={t.titulo}
        descripcion={t.descripcion}
      >
        <form action={accion} className="space-y-4" noValidate>
          <input type="hidden" name="solicitudId" value={solicitudId} />
          <input type="hidden" name="decision" value={decision} />

          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

          <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {resumen}
          </p>

          <Campo
            id={`nota-solicitud-${solicitudId}-${decision}`}
            etiqueta={decision === "rechazado" ? "Motivo" : "Nota (opcional)"}
            ayuda="Queda registrado en cada equipo y le llega al socio."
          >
            <AreaTexto
              id={`nota-solicitud-${solicitudId}-${decision}`}
              name="nota"
              rows={3}
              placeholder={
                decision === "rechazado"
                  ? "El equipo ya está comprometido para esa fecha."
                  : ""
              }
            />
          </Campo>

          <div className="flex justify-end gap-2">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Cancelar
            </Boton>
            <BotonEnviar variante={decision === "rechazado" ? "danger" : "primary"}>
              {t.confirmar}
            </BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}
