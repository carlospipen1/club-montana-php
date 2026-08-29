import { CUENTAS_DEMO, PASSWORD_DEMO, modoDemo } from "@/lib/demo";

/**
 * Las credenciales de la demostración, impresas en la pantalla de ingreso.
 *
 * Un demo con clave escondida no es un demo. Se muestran los tres roles para
 * que se pueda comparar lo que ve cada uno: es la mitad de la gracia del
 * sistema. Fuera del despliegue de muestra no renderiza nada.
 */
export function CuentasDemo() {
  if (!modoDemo) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-950">
        Entra con cualquiera de estas cuentas
      </p>
      <p className="mt-1 text-xs text-amber-900">
        Contraseña para todas:{" "}
        <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono">
          {PASSWORD_DEMO}
        </code>
      </p>

      <ul className="mt-4 space-y-3">
        {CUENTAS_DEMO.map((cuenta) => (
          <li key={cuenta.email} className="text-xs">
            <p className="font-medium text-amber-950">
              {cuenta.etiqueta} ·{" "}
              <code className="font-mono font-normal">{cuenta.email}</code>
            </p>
            <p className="mt-0.5 text-amber-900">{cuenta.descripcion}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
