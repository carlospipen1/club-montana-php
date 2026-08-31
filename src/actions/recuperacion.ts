"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { enviarCorreo, escaparHtml, plantillaCorreo } from "@/lib/correo";
import { bloqueadoEnDemo, modoDemo } from "@/lib/demo";
import { notificarA } from "@/lib/notificar";
import { hashPassword } from "@/lib/password";
import {
  anularTokensDe,
  buscarTokenVigente,
  crearTokenRecuperacion,
  enlaceRecuperacion,
  MAX_SOLICITUDES_POR_HORA,
  solicitudesUltimaHora,
} from "@/lib/recuperacion";
import { errorDeValidacion, exito, fallo, type EstadoFormulario } from "./tipos";

/* -------------------------------------------------------------------------- */
/*  Pedir el enlace                                                            */
/* -------------------------------------------------------------------------- */

const esquemaSolicitud = z.object({
  email: z.email("Escribe un correo válido.").trim().toLowerCase(),
});

/**
 * La misma respuesta pase lo que pase.
 *
 * Si dijéramos "ese correo no está registrado", cualquiera podría averiguar
 * quién es socio del club probando direcciones. Es la misma razón por la que el
 * login usa un hash señuelo.
 */
const RESPUESTA_UNICA =
  "Si ese correo pertenece a un socio, le enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam. El enlace vence en una hora.";

export async function accionSolicitarRecuperacion(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // En la demostración la pantalla se ve y el botón responde, pero no se manda
  // nada: las cuentas de muestra tienen correos que no existen, y un formulario
  // público que dispara correos es un regalo para quien quiera usarlo de otra
  // forma.
  if (modoDemo) {
    return bloqueadoEnDemo(
      "no se envían correos desde acá. En el sistema del club, a esta altura le llegaría al socio un enlace para crear una contraseña nueva.",
    );
  }

  const parseado = esquemaSolicitud.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { email } = parseado.data;

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);

  if (usuario && usuario.estado === "activo") {
    // Pasado el tope no se manda nada, pero la respuesta es la de siempre: al
    // socio impaciente le sirve igual el enlace que ya tiene en su bandeja.
    if ((await solicitudesUltimaHora(usuario.id)) < MAX_SOLICITUDES_POR_HORA) {
      const enlace = enlaceRecuperacion(await crearTokenRecuperacion(usuario.id));
      const nombre = usuario.nombres.split(" ")[0];

      try {
        await enviarCorreo({
          para: usuario.email,
          asunto: "Crea una contraseña nueva · Club de Montaña Collipulli",
          texto: [
            `Hola ${nombre},`,
            "",
            "Alguien pidió crear una contraseña nueva para tu cuenta de la intranet del club. Si fuiste tú, entra a esta dirección:",
            "",
            enlace,
            "",
            "El enlace vence en una hora y sirve una sola vez.",
            "",
            "Si no fuiste tú, no hagas nada: tu contraseña actual sigue funcionando y nadie puede cambiarla sin este enlace.",
            "",
            "Club de Montaña Collipulli",
          ].join("\n"),
          html: plantillaCorreo({
            titulo: "Crea una contraseña nueva",
            cuerpo: [
              `Hola ${escaparHtml(nombre)},`,
              "Alguien pidió crear una contraseña nueva para tu cuenta de la intranet del club. Si fuiste tú, usa el botón de abajo.",
              "El enlace vence en <strong>una hora</strong> y sirve una sola vez.",
            ],
            boton: { texto: "Crear contraseña nueva", url: enlace },
          }),
        });
      } catch (error) {
        // Se registra en el servidor y se sigue: si el fallo se contara al
        // visitante, un rato de caída del proveedor bastaría para distinguir
        // los correos que existen de los que no, que es justo lo que la
        // respuesta única evita.
        console.error("No se pudo enviar el correo de recuperación:", error);
      }
    }
  }

  return exito(RESPUESTA_UNICA);
}

/* -------------------------------------------------------------------------- */
/*  Usar el enlace                                                             */
/* -------------------------------------------------------------------------- */

const esquemaRestablecer = z
  .object({
    token: z.string().min(1),
    nueva: z.string().min(10, "La contraseña debe tener al menos 10 caracteres."),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });

export async function accionRestablecerPassword(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (modoDemo) {
    return bloqueadoEnDemo(
      "las contraseñas de las cuentas de muestra no se cambian, o la próxima persona no podría entrar.",
    );
  }

  const parseado = esquemaRestablecer.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { token, nueva } = parseado.data;

  // Se vuelve a validar acá y no sólo al abrir la página: entre que se cargó el
  // formulario y se envió pudo vencer, o pudo usarse en otra pestaña.
  const vigente = await buscarTokenVigente(token);
  if (!vigente) {
    return fallo(
      "Este enlace ya no sirve: venció o se usó. Pide uno nuevo desde la pantalla de ingreso.",
      formData,
    );
  }

  // El hasheo va fuera de la transacción: bcrypt con 12 rondas se demora, y no
  // hay razón para tener la fila del socio bloqueada mientras tanto.
  const passwordHash = await hashPassword(nueva);

  await db.transaction(async (tx) => {
    await tx
      .update(usuarios)
      .set({
        passwordHash,
        debeCambiarPassword: false,
        // Echa a quien estuviera dentro con la contraseña vieja. Es el sentido
        // de recuperar la cuenta: si alguien la tomó, esto lo saca.
        sesionesDesde: new Date(),
      })
      .where(eq(usuarios.id, vigente.usuario.id));

    // Sella también el que se acaba de ocupar: de ahí sale el "una sola vez".
    await anularTokensDe(vigente.usuario.id, tx);
  });

  await notificarA(vigente.usuario.id, {
    tipo: "sistema",
    titulo: "Tu contraseña cambió",
    mensaje:
      "Se creó una contraseña nueva para tu cuenta desde el enlace de recuperación. Si no fuiste tú, avísale a la directiva.",
    enlace: "/panel/perfil",
  });

  redirect("/login?restablecida=1");
}
