import "server-only";

/**
 * Envío de correo.
 *
 * Se habla directo con la API de Resend por `fetch` en vez de instalar su SDK:
 * es un POST con un JSON, y el paquete no aporta nada que justifique otra
 * dependencia.
 *
 * Esto es para el correo que manda el *sistema* (recuperar contraseña, avisos).
 * El correo de las personas —presidente@, contacto@— es otra cosa y vive en
 * otro proveedor, aunque los dos firmen con el mismo dominio. Cuando existan
 * ambos, el registro SPF tiene que autorizar a los dos o el segundo empieza a
 * caer en spam sin dar ningún error.
 */

const API = "https://api.resend.com/emails";

/**
 * El remitente tiene que pertenecer a un dominio verificado en Resend. Mientras
 * no exista el dominio del club, cualquier envío real va a fallar; en desarrollo
 * eso no importa porque no se envía nada (ver abajo).
 */
function remitente(): string {
  return (
    process.env.CORREO_REMITENTE ??
    "Club de Montaña Collipulli <no-reply@clubdemontanacollipulli.cl>"
  );
}

/**
 * ¿Hay forma de mandar un correo?
 *
 * Es la misma condición que aplica `enviarCorreo` más abajo, expuesta para que
 * las pantallas no ofrezcan recuperar la contraseña cuando el envío no está
 * configurado. Un enlace que no hace nada y no lo dice es peor que no tenerlo:
 * el socio espera un correo que nunca va a llegar.
 *
 * En desarrollo siempre está habilitado, porque ahí el correo se imprime en la
 * consola en vez de enviarse.
 */
export function correoHabilitado(): boolean {
  return Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";
}

export type Correo = {
  para: string;
  asunto: string;
  /** Versión de texto plano. Obligatoria: hay quien lee el correo sin HTML. */
  texto: string;
  html: string;
};

/**
 * Envía un correo. Lanza si no se pudo entregar.
 *
 * Quien llama decide qué hacer con el fallo; acá no se traga ningún error,
 * porque un correo que no llega y no avisa es peor que uno que no llega.
 */
export async function enviarCorreo({ para, asunto, texto, html }: Correo): Promise<void> {
  const clave = process.env.RESEND_API_KEY;

  // Sin clave configurada, en desarrollo el correo se imprime en la consola del
  // servidor. Permite probar el flujo completo —incluido el enlace— sin cuenta
  // de Resend ni dominio. En producción, en cambio, es un error de despliegue y
  // tiene que doler.
  if (!clave) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Falta RESEND_API_KEY: no hay forma de enviar correo.");
    }
    console.info(
      [
        "",
        "──── Correo simulado (no hay RESEND_API_KEY) ────",
        `Para:    ${para}`,
        `Asunto:  ${asunto}`,
        "",
        texto,
        "─────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  const respuesta = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remitente(),
      to: [para],
      subject: asunto,
      text: texto,
      html,
    }),
  });

  if (!respuesta.ok) {
    // El cuerpo de Resend explica el motivo (dominio sin verificar, clave
    // inválida, destinatario rechazado) y sin él el diagnóstico es adivinanza.
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Resend respondió ${respuesta.status}: ${detalle.slice(0, 500)}`);
  }
}

/**
 * Envoltorio HTML de los correos del club.
 *
 * Sin imágenes ni hojas de estilo externas: los clientes de correo las bloquean
 * por defecto y el mensaje termina viéndose peor que si nunca hubieran estado.
 * Estilos en línea por la misma razón —Gmail descarta las etiquetas <style>—.
 */
export function plantillaCorreo({
  titulo,
  cuerpo,
  boton,
}: {
  titulo: string;
  /** Párrafos, ya escapados. */
  cuerpo: string[];
  boton?: { texto: string; url: string };
}): string {
  const parrafos = cuerpo
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c">${p}</p>`,
    )
    .join("");

  const accion = boton
    ? `<p style="margin:0 0 16px"><a href="${boton.url}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:600">${boton.texto}</a></p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#78716c">Si el botón no funciona, copia y pega esta dirección en tu navegador:<br><span style="word-break:break-all;color:#44403c">${boton.url}</span></p>`
    : "";

  return `<!doctype html>
<html lang="es-CL"><body style="margin:0;padding:24px;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 20px;font-size:18px;font-weight:600;color:#1c1917">${titulo}</h1>
    ${parrafos}
    ${accion}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e7e5e4;font-size:13px;color:#78716c">Club de Montaña Collipulli</p>
  </div>
</body></html>`;
}

/** Escapa texto que se va a interpolar en el HTML de un correo. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
