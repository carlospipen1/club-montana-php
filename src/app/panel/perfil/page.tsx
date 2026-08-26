import { requerirUsuario } from "@/lib/auth";
import { ETIQUETAS_ROL } from "@/lib/permisos";
import { formatearFecha } from "@/lib/utils";
import { Insignia } from "@/components/ui/datos";
import { CabeceraPagina, Tarjeta, TarjetaCabecera } from "@/components/ui/superficie";
import { FormularioContacto, FormularioPassword } from "./formularios";

export const metadata = { title: "Mi perfil" };

export default async function PaginaPerfil() {
  const usuario = await requerirUsuario();

  const datos = [
    { etiqueta: "Nombre", valor: `${usuario.nombres} ${usuario.apellidos}` },
    { etiqueta: "Correo", valor: usuario.email },
    { etiqueta: "RUT", valor: usuario.rut ?? "—" },
    { etiqueta: "Rol", valor: ETIQUETAS_ROL[usuario.rol] },
    {
      etiqueta: "Tipo de socio",
      valor: usuario.tipoMiembro === "estudiante" ? "Estudiante" : "General",
    },
    { etiqueta: "Socio desde", valor: formatearFecha(usuario.fechaIngreso) },
  ];

  return (
    <>
      <CabeceraPagina
        titulo="Mi perfil"
        descripcion="Tus datos en el club y tu contraseña."
      />

      <Tarjeta>
        <TarjetaCabecera
          titulo="Datos del club"
          descripcion="Para corregir algo de acá, habla con la directiva."
          accion={
            <Insignia tono={usuario.estado === "activo" ? "exito" : "neutro"}>
              {usuario.estado === "activo" ? "Socio activo" : "Inactivo"}
            </Insignia>
          }
        />
        <dl className="grid gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {datos.map((d) => (
            <div key={d.etiqueta}>
              <dt className="text-xs text-stone-500">{d.etiqueta}</dt>
              <dd className="text-sm font-medium text-stone-900">{d.valor}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <TarjetaCabecera
            titulo="Contacto"
            descripcion="Cómo ubicarte, y a quién avisar en caso de emergencia."
          />
          <FormularioContacto usuario={usuario} />
        </Tarjeta>

        <Tarjeta className="self-start">
          <TarjetaCabecera titulo="Contraseña" />
          <FormularioPassword temporal={usuario.debeCambiarPassword} />
        </Tarjeta>
      </div>
    </>
  );
}
