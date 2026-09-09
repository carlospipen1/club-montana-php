"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Send, X } from "lucide-react";

import { accionSolicitarPrestamo } from "@/actions/equipos";
import { BotonEnviar, Modal } from "@/components/ui/acciones";
import { useModalAccion } from "@/components/ui/usar-modal-accion";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Input } from "@/components/ui/campos";
import { hoyISO } from "@/lib/utils";

/**
 * El carro del pedido de equipo.
 *
 * Antes cada equipo era una solicitud aparte: para una salida había que abrir
 * el mismo formulario cinco veces y escribir cinco veces las mismas fechas y el
 * mismo motivo. Ahora se marca lo que se necesita recorriendo el inventario y
 * al final se llena una sola vez.
 *
 * La selección vive en este contexto y no en la URL ni en el servidor: es un
 * borrador, no un dato del club. Si la persona recarga la página, se pierde, y
 * está bien que así sea.
 *
 * La tabla la sigue armando el servidor —son 82 filas y no hay razón para
 * mandarlas al navegador—: acá adentro sólo viven la casilla de cada fila y la
 * barra de abajo, que son las dos piezas que necesitan estado.
 */

type Elegido = { id: number; nombre: string };

type Pedido = {
  elegidos: Elegido[];
  alternar: (equipo: Elegido) => void;
  quitar: (id: number) => void;
  limpiar: () => void;
  tiene: (id: number) => boolean;
};

const ContextoPedido = createContext<Pedido | null>(null);

function usePedido(): Pedido {
  const contexto = useContext(ContextoPedido);
  if (!contexto) {
    throw new Error("Falta <ProveedorPedido> alrededor de esta parte de la página.");
  }
  return contexto;
}

export function ProveedorPedido({ children }: { children: ReactNode }) {
  const [elegidos, setElegidos] = useState<Elegido[]>([]);

  const valor = useMemo<Pedido>(
    () => ({
      elegidos,
      alternar: (equipo) =>
        setElegidos((previos) =>
          previos.some((e) => e.id === equipo.id)
            ? previos.filter((e) => e.id !== equipo.id)
            : [...previos, equipo],
        ),
      quitar: (id) => setElegidos((previos) => previos.filter((e) => e.id !== id)),
      limpiar: () => setElegidos([]),
      tiene: (id) => elegidos.some((e) => e.id === id),
    }),
    [elegidos],
  );

  return <ContextoPedido value={valor}>{children}</ContextoPedido>;
}

export function CasillaEquipo({
  id,
  nombre,
  deshabilitada,
}: {
  id: number;
  nombre: string;
  deshabilitada?: boolean;
}) {
  const { tiene, alternar } = usePedido();

  return (
    <input
      type="checkbox"
      className="size-4 rounded border-stone-300 text-brand-700 focus-visible:outline-brand-600 disabled:opacity-40"
      checked={tiene(id)}
      disabled={deshabilitada}
      onChange={() => alternar({ id, nombre })}
      aria-label={`Agregar ${nombre} al pedido`}
    />
  );
}

/**
 * La barra que aparece abajo cuando hay algo marcado, y el formulario del
 * pedido.
 *
 * Queda fija sobre el borde inferior porque la lista es larga: si el botón
 * estuviera al final de la tabla, habría que bajar 82 filas para llegar a él.
 */
export function BarraPedido() {
  const { elegidos, quitar, limpiar } = usePedido();
  const { abierto, abrir, cerrar, estado, accion } = useModalAccion(
    accionSolicitarPrestamo,
    { cerrarAlExito: false },
  );

  if (elegidos.length === 0) return null;

  const cuantos = elegidos.length;

  // Al enviarse con éxito el carro se vacía, pero recién cuando la persona
  // cierra el aviso: si se limpiara antes, la barra desaparecería con el modal
  // abierto encima.
  function cerrarYLimpiar() {
    cerrar();
    if (estado.ok) limpiar();
  }

  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-700">
            <span className="font-medium text-stone-900">
              {cuantos === 1 ? "1 equipo" : `${cuantos} equipos`}
            </span>{" "}
            en tu pedido
          </p>
          <div className="flex items-center gap-2">
            <Boton variante="ghost" tamano="sm" onClick={limpiar}>
              Vaciar
            </Boton>
            <Boton tamano="sm" onClick={abrir}>
              <Send aria-hidden />
              Pedir {cuantos === 1 ? "este equipo" : `estos ${cuantos}`}
            </Boton>
          </div>
        </div>
      </div>

      <Modal
        abierto={abierto}
        onCerrar={cerrarYLimpiar}
        titulo="Solicitar equipo"
        descripcion="Quien lleva los equipos revisa el pedido y responde cada cosa por separado."
        ancho="lg"
      >
        {estado.ok ? (
          <div className="space-y-4">
            <Aviso tono="exito">{estado.mensaje}</Aviso>
            <div className="flex justify-end">
              <Boton variante="outline" onClick={cerrarYLimpiar}>
                Listo
              </Boton>
            </div>
          </div>
        ) : (
          <form action={accion} className="space-y-4" noValidate>
            {elegidos.map((e) => (
              <input key={e.id} type="hidden" name="equipoId" value={e.id} />
            ))}

            {estado.mensaje && <Aviso tono="error">{estado.mensaje}</Aviso>}

            <div>
              <p className="text-sm font-medium text-stone-900">
                {cuantos === 1 ? "Pides 1 equipo" : `Pides ${cuantos} equipos`}
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-2">
                {elegidos.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm text-stone-700"
                  >
                    <span className="truncate">{e.nombre}</span>
                    <button
                      type="button"
                      onClick={() => quitar(e.id)}
                      className="shrink-0 rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                      aria-label={`Quitar ${e.nombre} del pedido`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              {estado.errores?.equipoIds?.[0] && (
                <p className="mt-1 text-xs text-red-700">{estado.errores.equipoIds[0]}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="fechaDesde"
                etiqueta="Los retiro el"
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
                etiqueta="Los devuelvo el"
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
              ayuda="Vale para todo el pedido."
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
