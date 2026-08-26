"use client";

import { useActionState } from "react";
import { CalendarPlus, RefreshCw } from "lucide-react";

import {
  accionHabilitarAnio,
  accionRegistrarPago,
  accionSincronizarSocios,
} from "@/actions/cuotas";
import { ESTADO_INICIAL } from "@/actions/tipos";
import { BotonEnviar, Modal } from "@/components/ui/acciones";
import { useModalAccion } from "@/components/ui/usar-modal-accion";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Input } from "@/components/ui/campos";
import { formatearCLP, hoyISO, MESES } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Habilitar año                                                              */
/* -------------------------------------------------------------------------- */

export function HabilitarAnio({ anioSugerido }: { anioSugerido: number }) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionHabilitarAnio);

  return (
    <>
      <Boton onClick={abrir}>
        <CalendarPlus aria-hidden />
        Habilitar año
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Habilitar un año de cuotas"
        descripcion="Se generan las 12 mensualidades de cada socio activo con estos montos."
      >
        <form action={accion} className="space-y-4" noValidate>
          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

          <Campo id="anio" etiqueta="Año" requerido error={estado.errores?.anio?.[0]}>
            <Input
              id="anio"
              name="anio"
              type="number"
              min={2020}
              max={2100}
              defaultValue={estado.valores?.anio ?? anioSugerido}
              required
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="montoGeneral"
              etiqueta="Cuota socio general"
              ayuda="Pesos, sin decimales."
              requerido
              error={estado.errores?.montoGeneral?.[0]}
            >
              <Input
                id="montoGeneral"
                name="montoGeneral"
                type="number"
                min={0}
                step={100}
                defaultValue={estado.valores?.montoGeneral ?? 5000}
                required
              />
            </Campo>

            <Campo
              id="montoEstudiante"
              etiqueta="Cuota estudiante"
              requerido
              error={estado.errores?.montoEstudiante?.[0]}
            >
              <Input
                id="montoEstudiante"
                name="montoEstudiante"
                type="number"
                min={0}
                step={100}
                defaultValue={estado.valores?.montoEstudiante ?? 3000}
                required
              />
            </Campo>
          </div>

          <Aviso tono="atencion">
            Los montos quedan grabados en cada cuota de este año. Cambiarlos más
            adelante no altera lo ya generado.
          </Aviso>

          <div className="flex justify-end gap-2">
            <Boton type="button" variante="ghost" onClick={cerrar}>
              Cancelar
            </Boton>
            <BotonEnviar cargando="Generando…">Habilitar</BotonEnviar>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sincronizar socios nuevos                                                  */
/* -------------------------------------------------------------------------- */

export function SincronizarSocios({ anio }: { anio: number }) {
  const [estado, accion] = useActionState(accionSincronizarSocios, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="anio" value={anio} />
      <BotonEnviar variante="outline" cargando="Sincronizando…">
        <RefreshCw aria-hidden />
        Sincronizar socios
      </BotonEnviar>
      {estado.mensaje && (
        <span
          className={cn(
            "text-xs font-medium",
            estado.ok ? "text-emerald-700" : "text-red-700",
          )}
        >
          {estado.mensaje}
        </span>
      )}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Celda de mes + registro de pago                                            */
/* -------------------------------------------------------------------------- */

export type CuotaCelda = {
  id: number;
  mes: number;
  montoEsperado: number;
  montoPagado: number;
  estado: "pendiente" | "pagado" | "parcial";
  observaciones: string | null;
};

const ESTILO_CELDA = {
  pagado: "bg-emerald-500 text-white hover:bg-emerald-600",
  parcial: "bg-amber-400 text-amber-950 hover:bg-amber-500",
  pendiente: "bg-stone-100 text-stone-400 hover:bg-stone-200",
} as const;

export function CeldaCuota({
  cuota,
  socio,
  editable,
}: {
  cuota: CuotaCelda | undefined;
  socio: string;
  editable: boolean;
}) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionRegistrarPago);

  if (!cuota) {
    return (
      <span
        className="mx-auto block size-7 rounded-md bg-stone-50 ring-1 ring-stone-200 ring-inset"
        aria-label="Sin cuota generada"
        title="Sin cuota generada"
      />
    );
  }

  const etiqueta = `${MESES[cuota.mes - 1]}: ${
    cuota.estado === "pagado"
      ? "pagada"
      : cuota.estado === "parcial"
        ? `parcial, ${formatearCLP(cuota.montoPagado)} de ${formatearCLP(cuota.montoEsperado)}`
        : `pendiente, ${formatearCLP(cuota.montoEsperado)}`
  }`;

  const clases = cn(
    "mx-auto flex size-7 items-center justify-center rounded-md text-[0.625rem] font-semibold transition-colors",
    ESTILO_CELDA[cuota.estado],
  );

  if (!editable) {
    return (
      <span className={clases} title={etiqueta} aria-label={etiqueta}>
        {cuota.mes}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={clases}
        title={`${socio} — ${etiqueta}`}
        aria-label={`${socio} — ${etiqueta}. Registrar pago`}
      >
        {cuota.mes}
      </button>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={`${MESES[cuota.mes - 1]} · ${socio}`}
        descripcion={`Cuota de ${formatearCLP(cuota.montoEsperado)}`}
        ancho="sm"
      >
        <form action={accion} className="space-y-4" noValidate>
          <input type="hidden" name="cuotaId" value={cuota.id} />

          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

          <Campo
            id={`monto-${cuota.id}`}
            etiqueta="Monto pagado"
            ayuda={`0 deja la cuota como pendiente. El tope es ${formatearCLP(cuota.montoEsperado)}.`}
            requerido
            error={estado.errores?.montoPagado?.[0]}
          >
            <Input
              id={`monto-${cuota.id}`}
              name="montoPagado"
              type="number"
              min={0}
              max={cuota.montoEsperado}
              step={100}
              defaultValue={estado.valores?.montoPagado ?? cuota.montoPagado}
              required
              autoFocus
            />
          </Campo>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-stone-500">Atajos:</span>
            <button
              type="button"
              className="text-brand-700 text-xs font-medium underline"
              onClick={(e) => {
                const form = e.currentTarget.closest("form");
                const input = form?.querySelector<HTMLInputElement>(
                  'input[name="montoPagado"]',
                );
                if (input) input.value = String(cuota.montoEsperado);
              }}
            >
              Pago completo
            </button>
          </div>

          <Campo id={`fecha-${cuota.id}`} etiqueta="Fecha de pago">
            <Input
              id={`fecha-${cuota.id}`}
              name="fechaPago"
              type="date"
              defaultValue={cuota.montoPagado > 0 ? undefined : hoyISO()}
              max={hoyISO()}
            />
          </Campo>

          <Campo id={`obs-${cuota.id}`} etiqueta="Observaciones">
            <AreaTexto
              id={`obs-${cuota.id}`}
              name="observaciones"
              rows={2}
              defaultValue={estado.valores?.observaciones ?? cuota.observaciones ?? ""}
              placeholder="Transferencia, efectivo en reunión, etc."
            />
          </Campo>

          <div className="flex justify-end gap-2">
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
