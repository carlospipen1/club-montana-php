"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { cerrarSesion, iniciarSesion, requerirUsuario } from "@/lib/auth";
import { hashPassword, verificarPassword } from "@/lib/password";
import { errorDeValidacion, exito, fallo, type EstadoFormulario } from "./tipos";

const esquemaLogin = z.object({
  email: z.email("Escribe un correo válido.").trim().toLowerCase(),
  password: z.string().min(1, "Escribe tu contraseña."),
  siguiente: z.string().optional(),
});

/**
 * Hash de descarte con el mismo costo que uno real. Se compara contra él cuando
 * el correo no existe, para que un atacante no pueda deducir qué correos están
 * registrados midiendo el tiempo de respuesta.
 */
const HASH_SEÑUELO = "$2b$12$GiGeI42Cqh3ZHh5hcXP0luTiYKGARHcQSmbwxYTyKNLxOP4Ltzo/W";

export async function accionLogin(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const parseado = esquemaLogin.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { email, password, siguiente } = parseado.data;

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);

  const coincide = await verificarPassword(
    password,
    usuario?.passwordHash ?? HASH_SEÑUELO,
  );

  // Mensaje idéntico en todos los casos: no se revela si el correo existe ni si
  // la cuenta está desactivada.
  if (!usuario || !coincide || usuario.estado !== "activo") {
    return fallo("Correo o contraseña incorrectos.", formData);
  }

  await iniciarSesion(usuario.id);

  const destino = siguiente && siguiente.startsWith("/panel") ? siguiente : "/panel";
  redirect(destino);
}

export async function accionLogout() {
  await cerrarSesion();
  redirect("/login");
}

const esquemaPassword = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual."),
    nueva: z.string().min(10, "La nueva contraseña debe tener al menos 10 caracteres."),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });

export async function accionCambiarPassword(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();

  const parseado = esquemaPassword.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { actual, nueva } = parseado.data;

  if (!(await verificarPassword(actual, usuario.passwordHash))) {
    return { ok: false, errores: { actual: ["La contraseña actual no es correcta."] } };
  }

  await db
    .update(usuarios)
    .set({ passwordHash: await hashPassword(nueva), debeCambiarPassword: false })
    .where(eq(usuarios.id, usuario.id));

  return exito("Contraseña actualizada.");
}
