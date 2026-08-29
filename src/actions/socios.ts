"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { cuotasMensuales, rolEnum, usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { bloqueadoEnDemo, esCuentaDemo } from "@/lib/demo";
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

/** Lo que envía un `<input type="date">`. Cualquier otra cosa se rechaza acá y
 *  no en el motor de la base, que sólo sabe responder con una excepción. */
const fechaISO = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa una fecha con el formato AAAA-MM-DD.");

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
  // Las fechas iban sin validar y pasaban tal cual a Postgres: cualquier valor
  // raro reventaba en el insert y salía como un "no se pudo crear el socio"
  // sin decir qué campo estaba mal.
  fechaNacimiento: opcional(fechaISO),
  // Una casilla no marcada no viaja en el formulario, de ahí el valor por
  // defecto: si el campo no llega, la cuenta no es de socio.
  esSocio: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  tipoMiembro: z.enum(["general", "estudiante"]),
  // Los roles se leen del enum del esquema y no se escriben a mano: esta lista
  // era una copia y se quedó sin `secretario` al agregar las actas, así que el
  // formulario rechazaba ese rol como si faltara un campo.
  rol: z.enum(rolEnum.enumValues),
  fechaIngreso: opcional(fechaISO),
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

  let creadoId: number;

  try {
    const [creado] = await db
      .insert(usuarios)
      .values({
        nombres: d.nombres,
        apellidos: d.apellidos,
        email: d.email,
        rut: d.rut ? formatearRut(d.rut) : null,
        telefono: d.telefono ?? null,
        fechaNacimiento: d.fechaNacimiento || null,
        esSocio: d.esSocio,
        tipoMiembro: d.tipoMiembro,
        rol: d.rol,
        fechaIngreso: d.fechaIngreso || null,
        passwordHash: await hashPassword(passwordTemporal),
        debeCambiarPassword: true,
      })
      .returning({ id: usuarios.id });

    creadoId = creado.id;
  } catch (error) {
    // Sin esta línea el fallo era invisible: el catch devolvía "No se pudo crear
    // el socio" y no quedaba rastro de la causa en ninguna parte.
    console.error("accionCrearSocio: falló la creación", error);
    return (
      conflictoUnico(error, formData) ?? fallo("No se pudo crear el socio.", formData)
    );
  }

  // La bienvenida va fuera del try anterior a propósito. Estaba dentro, y eso
  // hacía que un fallo posterior al insert respondiera "no se pudo crear el
  // socio" cuando el socio ya existía: quien lo intentaba de nuevo chocaba
  // entonces con el correo duplicado, sin entender por qué.
  try {
    await notificarA(creadoId, {
      tipo: "sistema",
      titulo: "Bienvenido al club",
      mensaje: `${autor.nombres} te creó una cuenta en la intranet. Cambia tu contraseña temporal desde tu perfil.`,
      enlace: "/panel/perfil",
    });
  } catch (error) {
    console.error("accionCrearSocio: socio creado, pero falló su notificación", error);
  }

  revalidatePath("/panel/socios");

  return {
    ok: true,
    mensaje: `${d.nombres} ${d.apellidos} quedó registrado.`,
    // Se muestra una sola vez: no se guarda en claro en ninguna parte.
    datos: { passwordTemporal, email: d.email },
  };
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

  const [objetivo] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  // Cambiarle el correo o el rol a una cuenta de muestra rompería el acceso de
  // la siguiente persona que entre a probar.
  if (objetivo && esCuentaDemo(objetivo.email)) {
    return bloqueadoEnDemo(
      "las cuentas de muestra no se pueden editar. Prueba editando cualquier otro socio.",
    );
  }

  try {
    await db
      .update(usuarios)
      .set({
        nombres: d.nombres,
        apellidos: d.apellidos,
        email: d.email,
        rut: d.rut ? formatearRut(d.rut) : null,
        telefono: d.telefono ?? null,
        fechaNacimiento: d.fechaNacimiento || null,
        esSocio: d.esSocio,
        tipoMiembro: d.tipoMiembro,
        rol: d.rol,
        fechaIngreso: d.fechaIngreso || null,
      })
      .where(eq(usuarios.id, id));

    // Al dejar de ser socio, se retiran sus cuotas pendientes: si no, quedarían
    // sumando a la deuda del club para siempre, invisibles en la tesorería
    // porque esa pantalla ya no lista cuentas administrativas.
    //
    // Sólo se borran las que nadie pagó. Un pago registrado es un hecho
    // contable y no se borra por un cambio de configuración.
    if (!d.esSocio) {
      await db
        .delete(cuotasMensuales)
        .where(
          and(eq(cuotasMensuales.usuarioId, id), eq(cuotasMensuales.montoPagado, 0)),
        );
    }

    revalidatePath("/panel/socios");
    revalidatePath("/panel/cuotas");
    return exito(
      d.esSocio
        ? "Datos actualizados."
        : "Datos actualizados. Es una cuenta administrativa: se retiró de la tesorería.",
    );
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

  const [objetivo] = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  // Desactivar una cuenta de muestra la dejaría fuera del login para siempre.
  if (!objetivo || esCuentaDemo(objetivo.email)) return;

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

  // Resetear la clave de una cuenta de muestra dejaría a la siguiente persona
  // sin poder entrar: el login verifica la contraseña antes de resembrar.
  if (esCuentaDemo(socio.email)) {
    return bloqueadoEnDemo(
      "no se puede resetear la contraseña de una cuenta de muestra. Prueba con cualquier otro socio.",
    );
  }

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
