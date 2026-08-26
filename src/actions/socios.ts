"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { generarPasswordTemporal, hashPassword } from "@/lib/password";
import { formatearRut, validarRut } from "@/lib/rut";
import { notificarA } from "@/lib/notificar";
import {
  errorDeValidacion,
  exito,
  fallo,
  falloDeCampo,
  type EstadoFormulario,
} from "./tipos";

const opcional = (s: z.ZodString) =>
  z.preprocess((v) => (v === "" ? undefined : v), s.optional());

const rutValido = z
  .string()
  .trim()
  .refine((v) => v === "" || validarRut(v), {
    message: "El RUT no es válido (revisa el dígito verificador).",
  });

const esquemaSocio = z.object({
  nombres: z.string().trim().min(2, "Escribe el o los nombres."),
  apellidos: z.string().trim().min(2, "Escribe los apellidos."),
  email: z.email("Escribe un correo válido.").trim().toLowerCase(),
  rut: rutValido,
  telefono: opcional(z.string().trim().max(30)),
  tipoMiembro: z.enum(["general", "estudiante"]),
  rol: z.enum(["admin", "presidente", "tesorero", "encargado_equipo", "miembro"]),
  fechaIngreso: opcional(z.string().trim()),
});

/** Traduce el error de índice único de Postgres a un mensaje por campo. */
function conflictoUnico(error: unknown, formData: FormData): EstadoFormulario | null {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (!mensaje.includes("duplicate key")) return null;

  if (mensaje.includes("email")) {
    return falloDeCampo({ email: ["Ya existe un socio con ese correo."] }, formData);
  }
  if (mensaje.includes("rut")) {
    return falloDeCampo({ rut: ["Ya existe un socio con ese RUT."] }, formData);
  }
  return fallo("Ya existe un registro con esos datos.", formData);
}

export async function accionCrearSocio(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarSocios");

  const parseado = esquemaSocio.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;
  const passwordTemporal = generarPasswordTemporal();

  try {
    const [creado] = await db
      .insert(usuarios)
      .values({
        nombres: d.nombres,
        apellidos: d.apellidos,
        email: d.email,
        rut: d.rut ? formatearRut(d.rut) : null,
        telefono: d.telefono ?? null,
        tipoMiembro: d.tipoMiembro,
        rol: d.rol,
        fechaIngreso: d.fechaIngreso || null,
        passwordHash: await hashPassword(passwordTemporal),
        debeCambiarPassword: true,
      })
      .returning({ id: usuarios.id });

    await notificarA(creado.id, {
      tipo: "sistema",
      titulo: "Bienvenido al club",
      mensaje: `${autor.nombres} te creó una cuenta en la intranet. Cambia tu contraseña temporal desde tu perfil.`,
      enlace: "/panel/perfil",
    });

    revalidatePath("/panel/socios");

    return {
      ok: true,
      mensaje: `${d.nombres} ${d.apellidos} quedó registrado.`,
      // Se muestra una sola vez: no se guarda en claro en ninguna parte.
      datos: { passwordTemporal, email: d.email },
    };
  } catch (error) {
    return (
      conflictoUnico(error, formData) ?? fallo("No se pudo crear el socio.", formData)
    );
  }
}

export async function accionActualizarSocio(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarSocios");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Socio no válido.", formData);

  const parseado = esquemaSocio.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  try {
    await db
      .update(usuarios)
      .set({
        nombres: d.nombres,
        apellidos: d.apellidos,
        email: d.email,
        rut: d.rut ? formatearRut(d.rut) : null,
        telefono: d.telefono ?? null,
        tipoMiembro: d.tipoMiembro,
        rol: d.rol,
        fechaIngreso: d.fechaIngreso || null,
      })
      .where(eq(usuarios.id, id));

    revalidatePath("/panel/socios");
    return exito("Datos actualizados.");
  } catch (error) {
    return (
      conflictoUnico(error, formData) ??
      fallo("No se pudo actualizar el socio.", formData)
    );
  }
}

export async function accionCambiarEstadoSocio(formData: FormData) {
  const autor = await requerirCapacidad("gestionarSocios");

  const id = Number(formData.get("id"));
  const activar = formData.get("activar") === "1";
  if (!Number.isInteger(id)) return;

  // Nadie puede desactivarse a sí mismo y quedar fuera de su propia sesión.
  if (id === autor.id) return;

  await db
    .update(usuarios)
    .set({ estado: activar ? "activo" : "inactivo" })
    .where(eq(usuarios.id, id));

  revalidatePath("/panel/socios");
}

export async function accionResetearPassword(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarSocios");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Socio no válido.", formData);

  const [socio] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  if (!socio) return fallo("El socio no existe.", formData);

  const passwordTemporal = generarPasswordTemporal();

  await db
    .update(usuarios)
    .set({
      passwordHash: await hashPassword(passwordTemporal),
      debeCambiarPassword: true,
    })
    .where(eq(usuarios.id, id));

  await notificarA(id, {
    tipo: "sistema",
    titulo: "Tu contraseña fue restablecida",
    mensaje:
      "La directiva generó una contraseña temporal para tu cuenta. Cámbiala desde tu perfil apenas ingreses.",
    enlace: "/panel/perfil",
  });

  revalidatePath("/panel/socios");

  return {
    ok: true,
    mensaje: "Contraseña temporal generada.",
    datos: { passwordTemporal, email: socio.email },
  };
}
