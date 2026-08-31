import { SignJWT, jwtVerify } from "jose";

/**
 * Manejo de la cookie de sesión.
 *
 * Este archivo sólo usa `jose`, que corre tanto en Node como en el runtime edge,
 * para poder importarse desde `middleware.ts`. El hasheo de contraseñas vive
 * aparte en `password.ts` porque bcrypt no corre en edge.
 *
 * El token guarda únicamente el id del usuario y su fecha de emisión. El rol y el
 * estado se leen de la base de datos en cada request (ver `auth.ts`): así, si se
 * desactiva a un socio o se le cambia el rol, el cambio es inmediato y no queda
 * esperando a que expire un token con datos viejos.
 *
 * La fecha de emisión existe para lo mismo: `auth.ts` la compara contra
 * `usuarios.sesionesDesde` y descarta los tokens anteriores al último cambio de
 * contraseña.
 */

const COOKIE = "sesion";
const DIAS = 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET falta o es muy corto (mínimo 32 caracteres). Genera uno con: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * A qué despliegue pertenece una sesión.
 *
 * El mismo código sirve al club y a la demostración pública, donde las
 * credenciales están impresas en la pantalla a propósito. Si los dos
 * despliegues compartieran `AUTH_SECRET` —un descuido plausible al crear el
 * segundo proyecto—, cualquiera podría entrar a la demostración como
 * administrador, copiar su cookie al dominio del club y ser aceptado: el token
 * sólo lleva un id, y ese id existe en las dos bases.
 *
 * Con esto el token dice de dónde viene y el otro lado lo rechaza. Compartir el
 * secreto pasa a ser un error sin consecuencias.
 *
 * Se lee `MODO_DEMO` directo y no desde `lib/demo.ts` porque ese archivo es
 * `server-only` y este se importa desde el proxy, que corre en el edge.
 */
export function audienciaActual(): "club" | "demo" {
  return process.env.MODO_DEMO === "1" ? "demo" : "club";
}

export type Payload = {
  userId: number;
  /** Fecha de emisión del token, en segundos. Sale del `iat` que pone `jose`. */
  emitidoEn: number;
  /** Despliegue que lo emitió. Nulo en tokens anteriores a esta comprobación. */
  audiencia: string | null;
};

export async function firmarSesion(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience(audienciaActual())
    .setExpirationTime(`${DIAS}d`)
    .sign(getSecret());
}

export async function verificarSesion(
  token: string | undefined,
): Promise<Payload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const { userId, iat, aud } = payload;
    if (typeof userId !== "number" || typeof iat !== "number") return null;
    // La audiencia se devuelve pero no se exige acá: el proxy corre en el edge,
    // donde `MODO_DEMO` no está garantizado, y equivocarse ahí dejaría fuera a
    // sesiones legítimas. La comprueba `auth.ts`, que corre en Node.
    return { userId, emitidoEn: iat, audiencia: typeof aud === "string" ? aud : null };
  } catch {
    // Token vencido, manipulado o firmado con otro secreto.
    return null;
  }
}

export const cookieSesion = {
  nombre: COOKIE,
  opciones: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DIAS * 24 * 60 * 60,
  },
};
