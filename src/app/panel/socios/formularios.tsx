"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Pencil, UserPlus } from "lucide-react";

import {
  accionActualizarSocio,
  accionCrearSocio,
  accionResetearPassword,
} from "@/actions/socios";
import type { EstadoFormulario } from "@/actions/tipos";
import { BotonEnviar, Modal } from "@/components/ui/acciones";
import { useModalAccion } from "@/components/ui/usar-modal-accion";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Selector } from "@/components/ui/campos";
import { DESCRIPCIONES_ROL, ETIQUETAS_ROL } from "@/lib/permisos";
import { formatearRut } from "@/lib/rut";
import { calcularEdad, hoyISO } from "@/lib/utils";
import type { Rol, Usuario } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  Contraseña temporal                                                        */
/* -------------------------------------------------------------------------- */

/**
 * La contraseña temporal se muestra una única vez. No se guarda en claro en
 * ninguna parte, así que si se cierra este panel hay que generar otra.
 */
function PasswordTemporal({ email, password }: { email: string; password: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Aviso tono="exito" titulo="Contraseña temporal generada">
      <p className="mb-2">
        Entrégasela a <strong>{email}</strong>. No se puede volver a consultar: si se
        pierde, hay que generar una nueva.
      </p>
      <div className="flex items-center gap-2">
        <code className="rounded-md bg-white px-3 py-1.5 font-mono text-sm ring-1 ring-emerald-300 ring-inset">
          {password}
        </code>
        <Boton type="button" variante="outline" tamano="sm" onClick={copiar}>
          {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copiado ? "Copiada" : "Copiar"}
        </Boton>
      </div>
    </Aviso>
  );
}

/* -------------------------------------------------------------------------- */
/*  Campos compartidos                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Orden en que se ofrecen los roles al crear o editar un socio: de menos a más
 * atribuciones.
 *
 * `secretario` faltó acá durante un tiempo —se agregó junto con las actas y esta
 * lista quedó atrás—, así que no se podía nombrar secretaria a nadie desde el
 * panel. Para que no vuelva a pasar, la comprobación de abajo rompe la
 * compilación si algún rol del esquema no está en esta lista.
 */
const ROLES = [
  "miembro",
  "encargado_equipo",
  "comision_tecnica",
  "secretario",
  "tesorero",
  "presidente",
  "admin",
] as const satisfies readonly Rol[];

type RolQueFalta = Exclude<Rol, (typeof ROLES)[number]>;
// Si se agrega un rol al esquema y no se suma a ROLES, `RolQueFalta` deja de ser
// `never` y esta línea no compila.
const _todosLosRolesEstan: [RolQueFalta] extends [never] ? true : never = true;
void _todosLosRolesEstan;

function CamposSocio({
  socio,
  errores,
  valores,
}: {
  socio?: Usuario;
  errores?: EstadoFormulario["errores"];
  valores?: EstadoFormulario["valores"];
}) {
  const [rut, setRut] = useState(valores?.rut ?? socio?.rut ?? "");
  const [rol, setRol] = useState<Rol>((valores?.rol as Rol) ?? socio?.rol ?? "miembro");
  // Controlado para poder mostrar la edad mientras se escribe la fecha.
  const [fechaNacimiento, setFechaNacimiento] = useState(
    valores?.fechaNacimiento ?? socio?.fechaNacimiento ?? "",
  );
  const edad = calcularEdad(fechaNacimiento || null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo id="nombres" etiqueta="Nombres" requerido error={errores?.nombres?.[0]}>
        <Input
          id="nombres"
          name="nombres"
          defaultValue={valores?.nombres ?? socio?.nombres}
          required
        />
      </Campo>

      <Campo
        id="apellidos"
        etiqueta="Apellidos"
        requerido
        error={errores?.apellidos?.[0]}
      >
        <Input
          id="apellidos"
          name="apellidos"
          defaultValue={valores?.apellidos ?? socio?.apellidos}
          required
        />
      </Campo>

      <Campo
        id="email"
        etiqueta="Correo electrónico"
        requerido
        error={errores?.email?.[0]}
        className="sm:col-span-2"
      >
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={valores?.email ?? socio?.email}
          required
        />
      </Campo>

      <Campo
        id="rut"
        etiqueta="RUT"
        ayuda="Se valida el dígito verificador."
        error={errores?.rut?.[0]}
      >
        <Input
          id="rut"
          name="rut"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          onBlur={(e) => setRut(formatearRut(e.target.value))}
          placeholder="12.345.678-5"
          inputMode="text"
        />
      </Campo>

      <Campo id="telefono" etiqueta="Teléfono" error={errores?.telefono?.[0]}>
        <Input
          id="telefono"
          name="telefono"
          type="tel"
          defaultValue={valores?.telefono ?? socio?.telefono ?? ""}
          placeholder="+56 9 1234 5678"
        />
      </Campo>

      <Campo id="tipoMiembro" etiqueta="Tipo de socio" requerido>
        <Selector
          id="tipoMiembro"
          name="tipoMiembro"
          defaultValue={valores?.tipoMiembro ?? socio?.tipoMiembro ?? "general"}
        >
          <option value="general">General</option>
          <option value="estudiante">Estudiante</option>
        </Selector>
      </Campo>

      <Campo id="rol" etiqueta="Rol" ayuda={DESCRIPCIONES_ROL[rol]} requerido>
        <Selector
          id="rol"
          name="rol"
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETAS_ROL[r]}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo
        id="fechaNacimiento"
        etiqueta="Fecha de nacimiento"
        ayuda={edad !== null ? `${edad} años cumplidos.` : "Sirve para saber la edad."}
        error={errores?.fechaNacimiento?.[0]}
      >
        <Input
          id="fechaNacimiento"
          name="fechaNacimiento"
          type="date"
          max={hoyISO()}
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
        />
      </Campo>

      <Campo
        id="fechaIngreso"
        etiqueta="Fecha de ingreso al club"
        error={errores?.fechaIngreso?.[0]}
      >
        <Input
          id="fechaIngreso"
          name="fechaIngreso"
          type="date"
          defaultValue={valores?.fechaIngreso ?? socio?.fechaIngreso ?? ""}
        />
      </Campo>

      {/* Separa a las personas del club de las cuentas de operación. Una cuenta
          administrativa entra y gestiona, pero no paga cuota ni cuenta como
          socio en las estadísticas. */}
      <label className="flex gap-3 rounded-lg bg-stone-50 p-4 ring-1 ring-stone-200 ring-inset sm:col-span-2">
        <input
          type="checkbox"
          name="esSocio"
          defaultChecked={valores ? valores.esSocio === "on" : (socio?.esSocio ?? true)}
          className="text-brand-700 focus:ring-brand-500 mt-0.5 size-4 shrink-0 rounded border-stone-300"
        />
        <span className="text-sm">
          <span className="block font-medium text-stone-800">Es socio del club</span>
          <span className="block text-stone-500">
            Desmárcalo para cuentas administrativas: no se le generan cuotas ni aparece
            en la tesorería.
          </span>
        </span>
      </label>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Crear                                                                      */
/* -------------------------------------------------------------------------- */

export function NuevoSocio() {
  const { abierto, abrir, cerrar, estado, accion } = useModalAccion(accionCrearSocio, {
    cerrarAlExito: false,
  });

  const password = estado.ok ? estado.datos?.passwordTemporal : undefined;

  return (
    <>
      <Boton onClick={abrir}>
        <UserPlus aria-hidden />
        Nuevo socio
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Registrar un socio"
        descripcion="Se genera una contraseña temporal que deberás entregarle."
        ancho="lg"
      >
        {password ? (
          <div className="space-y-4">
            <PasswordTemporal email={estado.datos!.email} password={password} />
            <div className="flex justify-end">
              <Boton
                variante="outline"
                onClick={() => {
                  cerrar();
                  // Recarga para que la tabla muestre al socio nuevo.
                  window.location.reload();
                }}
              >
                Listo
              </Boton>
            </div>
          </div>
        ) : (
          <form action={accion} className="space-y-5" noValidate>
            {estado.mensaje && !estado.ok && (
              <Aviso tono="error">{estado.mensaje}</Aviso>
            )}

            <CamposSocio errores={estado.errores} valores={estado.valores} />

            <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
              <Boton type="button" variante="ghost" onClick={cerrar}>
                Cancelar
              </Boton>
              <BotonEnviar cargando="Creando…">Crear socio</BotonEnviar>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Editar                                                                     */
/* -------------------------------------------------------------------------- */

export function EditarSocio({ socio }: { socio: Usuario }) {
  const { abierto, abrir, cerrar, estado, accion } =
    useModalAccion(accionActualizarSocio);

  return (
    <>
      <Boton
        variante="ghost"
        tamano="sm"
        onClick={abrir}
        aria-label={`Editar a ${socio.nombres} ${socio.apellidos}`}
      >
        <Pencil aria-hidden />
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo={`Editar a ${socio.nombres} ${socio.apellidos}`}
        ancho="lg"
      >
        <form action={accion} className="space-y-5" noValidate>
          <input type="hidden" name="id" value={socio.id} />

          {estado.mensaje && !estado.ok && <Aviso tono="error">{estado.mensaje}</Aviso>}

          <CamposSocio
            socio={socio}
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

/* -------------------------------------------------------------------------- */
/*  Restablecer contraseña                                                     */
/* -------------------------------------------------------------------------- */

export function ResetearPassword({ socio }: { socio: Usuario }) {
  const { abierto, abrir, cerrar, estado, accion } = useModalAccion(
    accionResetearPassword,
    {
      cerrarAlExito: false,
    },
  );

  const password = estado.ok ? estado.datos?.passwordTemporal : undefined;

  return (
    <>
      <Boton
        variante="ghost"
        tamano="sm"
        onClick={abrir}
        aria-label={`Restablecer la contraseña de ${socio.nombres}`}
      >
        <KeyRound aria-hidden />
      </Boton>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Restablecer contraseña"
        descripcion={`${socio.nombres} ${socio.apellidos} · ${socio.email}`}
      >
        {password ? (
          <div className="space-y-4">
            <PasswordTemporal email={socio.email} password={password} />
            <div className="flex justify-end">
              <Boton variante="outline" onClick={cerrar}>
                Listo
              </Boton>
            </div>
          </div>
        ) : (
          <form action={accion} className="space-y-4">
            <input type="hidden" name="id" value={socio.id} />

            {estado.mensaje && !estado.ok && (
              <Aviso tono="error">{estado.mensaje}</Aviso>
            )}

            <p className="text-sm text-stone-600">
              Se generará una contraseña nueva al azar y la actual dejará de funcionar
              de inmediato. El socio tendrá que cambiarla al ingresar.
            </p>

            <div className="flex justify-end gap-2">
              <Boton type="button" variante="ghost" onClick={cerrar}>
                Cancelar
              </Boton>
              <BotonEnviar variante="danger" cargando="Generando…">
                Restablecer
              </BotonEnviar>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
