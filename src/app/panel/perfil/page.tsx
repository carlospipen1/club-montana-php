import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { certificaciones, fichasSocio } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { ETIQUETAS_ROL } from "@/lib/permisos";
import { calcularEdad, formatearFecha } from "@/lib/utils";
import { Insignia } from "@/components/ui/datos";
import { CabeceraPagina, Tarjeta, TarjetaCabecera } from "@/components/ui/superficie";
import { FormularioContacto, FormularioPassword } from "./formularios";
import { Certificaciones, FormularioFicha } from "./ficha";

export const metadata = { title: "Mi perfil" };

export default async function PaginaPerfil() {
  const usuario = await requerirUsuario();

  // La ficha puede no existir todavía: se crea sola la primera vez que se
  // guarda, así que acá simplemente no hay fila.
  const [[ficha], cursos] = await Promise.all([
    db
      .select()
      .from(fichasSocio)
      .where(eq(fichasSocio.usuarioId, usuario.id))
      .limit(1),
    db
      .select()
      .from(certificaciones)
      .where(eq(certificaciones.usuarioId, usuario.id))
      // Lo que vence primero, primero: es lo que hay que renovar.
      .orderBy(asc(certificaciones.fechaVencimiento), asc(certificaciones.nombre)),
  ]);

  const datos = [
    { etiqueta: "Nombre", valor: `${usuario.nombres} ${usuario.apellidos}` },
    { etiqueta: "Correo", valor: usuario.email },
    { etiqueta: "RUT", valor: usuario.rut ?? "—" },
    {
      etiqueta: "Fecha de nacimiento",
      valor: usuario.fechaNacimiento
        ? `${formatearFecha(usuario.fechaNacimiento)} · ${calcularEdad(usuario.fechaNacimiento)} años`
        : "—",
    },
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

      <Tarjeta>
        <TarjetaCabecera
          titulo="Ficha médica"
          descripcion="La ven la directiva y quien dirige una salida, para saber qué hacer si algo pasa. Nadie más."
        />
        <FormularioFicha ficha={ficha ?? null} />
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera
          titulo="Cursos y certificaciones"
          descripcion="Primeros auxilios, autorrescate, avalanchas. Con su fecha de vencimiento."
        />
        <Certificaciones lista={cursos} />
      </Tarjeta>
    </>
  );
}
