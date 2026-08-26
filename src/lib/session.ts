import { SignJWT, jwtVerify } from "jose";

/**
 * Manejo de la cookie de sesión.
 *
 * Este archivo sólo usa `jose`, que corre tanto en Node como en el runtime edge,
 * para poder importarse desde `middleware.ts`. El hasheo de contraseñas vive
 * aparte en `password.ts` porque bcrypt no corre en edge.
 *
 * El token guarda únicamente el id del usuario. El rol y el estado se leen de la
 * base de datos en cada request (ver `auth.ts`): así, si se desactiva a un socio
 * o se le cambia el rol, el cambio es inmediato y no queda esperando a que expire
 * un token con datos viejos.
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

export type Payload = { userId: number };

export async function firmarSesion(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DIAS}d`)
    .sign(getSecret());
}

export async function verificarSesion(
  token: string | undefined,
): Promise<Payload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const userId = payload.userId;
    return typeof userId === "number" ? { userId } : null;
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
