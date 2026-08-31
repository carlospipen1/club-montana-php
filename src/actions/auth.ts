"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { cerrarSesion, iniciarSesion, requerirUsuario } from "@/lib/auth";
import { hashPassword, verificarPassword } from "@/lib/password";
import { bloqueadoEnDemo, esCuentaDemo } from "@/lib/demo";
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

  const buscar = async () =>
    (
      await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1)
    )[0];

  let usuario = await buscar();

  // Primer arranque de la demostración: la base recién creada está vacía, así
  // que no existe cuenta alguna con la que entrar. Se siembra y se vuelve a
  // buscar. La contraseña se verifica igual, después.
  if (!usuario && esCuentaDemo(email)) {
    const { sembrarDemo } = await import("@/db/semilla-demo");
    await sembrarDemo();
    usuario = await buscar();
  }

  const coincide = await verificarPassword(
    password,
    usuario?.passwordHash ?? HASH_SEÑUELO,
  );

  // Mensaje idéntico en todos los casos: no se revela si el correo existe ni si
  // la cuenta está desactivada.
  if (!usuario || !coincide || usuario.estado !== "activo") {
    return fallo("Correo o contraseña incorrectos.", formData);
  }

  // La demostración se resiembra en cada ingreso: quien entra después siempre
  // encuentra los mismos datos, sin importar lo que haya hecho el anterior. Es
  // más simple y más confiable que una tarea programada, y se cura sola.
  let usuarioId = usuario.id;
  if (esCuentaDemo(email)) {
    const { sembrarDemo } = await import("@/db/semilla-demo");
    await sembrarDemo();

    // La siembra vacía las tablas, así que el id anterior ya no existe.
    const reciente = await buscar();
    if (!reciente) return fallo("No se pudo preparar la demostración.", formData);
    usuarioId = reciente.id;
  }

  await iniciarSesion(usuarioId);

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

  // Si alguien cambiara la contraseña de una cuenta de muestra, la siguiente
  // persona no podría entrar: la verificación ocurre antes de resembrar.
  if (esCuentaDemo(usuario.email)) {
    return bloqueadoEnDemo(
      "la contraseña de las cuentas de muestra no se puede cambiar, o nadie más podría entrar.",
    );
  }

  const parseado = esquemaPassword.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { actual, nueva } = parseado.data;

  if (!(await verificarPassword(actual, usuario.passwordHash))) {
    return { ok: false, errores: { actual: ["La contraseña actual no es correcta."] } };
  }

  await db
    .update(usuarios)
    .set({
      passwordHash: await hashPassword(nueva),
      debeCambiarPassword: false,
      // Cierra las sesiones abiertas con la contraseña anterior: la propia de
      // otro navegador, y la de cualquiera que la tuviera.
      sesionesDesde: new Date(),
    })
    .where(eq(usuarios.id, usuario.id));

  // La de acá también quedó invalidada, así que se emite una nueva: quien acaba
  // de cambiar su contraseña a propósito no tiene por qué salir expulsado.
  await iniciarSesion(usuario.id);

  return exito("Contraseña actualizada.");
}
