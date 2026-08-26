"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { errorDeValidacion, exito, type EstadoFormulario } from "./tipos";

const esquemaPerfil = z.object({
  telefono: z.string().trim().max(30).optional(),
  contactoNombre: z.string().trim().max(120).optional(),
  contactoTelefono: z.string().trim().max(30).optional(),
  contactoRelacion: z.string().trim().max(60).optional(),
});

/**
 * Sólo se pueden editar los datos propios de contacto. El nombre, el RUT, el rol
 * y el tipo de socio los administra la directiva desde la sección Socios: un
 * socio no puede ascenderse a sí mismo cambiando un campo del formulario.
 */
export async function accionActualizarPerfil(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();

  const parseado = esquemaPerfil.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db
    .update(usuarios)
    .set({
      telefono: d.telefono || null,
      contactoEmergenciaNombre: d.contactoNombre || null,
      contactoEmergenciaTelefono: d.contactoTelefono || null,
      contactoEmergenciaRelacion: d.contactoRelacion || null,
    })
    .where(eq(usuarios.id, usuario.id));

  revalidatePath("/panel/perfil");
  return exito("Datos actualizados.");
}
