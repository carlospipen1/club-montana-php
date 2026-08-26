"use client";

import { Check, PackageCheck, X } from "lucide-react";

import { accionResolverPrestamo } from "@/actions/equipos";
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
