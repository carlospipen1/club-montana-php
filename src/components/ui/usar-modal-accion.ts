"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/actions/tipos";

type AccionFormulario = (
  estado: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

/**
 * Un modal que contiene un formulario y se cierra solo cuando la acción del
 * servidor responde con éxito.
 *
 * El cierre se decide comparando el estado con el de la renderización anterior,
 * y no dentro de un `useEffect`. Es el patrón que recomienda React para ajustar
 * estado a partir de un cambio: evita el render en cascada (montar el modal,
 * pintarlo y recién entonces cerrarlo) y no dispara la regla
 * `react-hooks/set-state-in-effect`.
 */
export function useModalAccion(
  accionServidor: AccionFormulario,
  /**
   * `false` para los formularios que, al tener éxito, muestran algo dentro del
   * propio modal —una contraseña temporal, por ejemplo— y por lo tanto deben
   * quedarse abiertos hasta que la persona lo cierre.
   */
  { cerrarAlExito = true }: { cerrarAlExito?: boolean } = {},
) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion] = useActionState(accionServidor, ESTADO_INICIAL);
  const [estadoPrevio, setEstadoPrevio] = useState(estado);

  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    if (cerrarAlExito && estado.ok) setAbierto(false);
  }

  return {
    abierto,
    abrir: () => setAbierto(true),
    cerrar: () => setAbierto(false),
    estado,
    accion,
  };
}
