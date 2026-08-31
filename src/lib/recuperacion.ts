import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, gte, isNull } from "drizzle-orm";

import { db } from "@/db";
import { tokensRecuperacion, usuarios, type Usuario } from "@/db/schema";
import { URL_SITIO } from "./sitio";

/**
 * Tokens de recuperación de contraseña.
 *
 * Las reglas, en una línea cada una: el enlace vive una hora, sirve una sola
 * vez, y pedir uno nuevo anula los anteriores. Un socio no puede pedir más de
 * tres por hora.
 */

/** Una hora es suficiente para ir al correo y volver, y poco para un enlace filtrado. */
const MINUTOS_VIGENCIA = 60;

/**
 * Tope de solicitudes por hora y por socio. No es tanto contra un atacante
 * —que no gana nada— como contra el socio que aprieta el botón cinco veces
 * porque el correo demoró, y después no sabe cuál de los cinco enlaces sirve.
 */
export const MAX_SOLICITUDES_POR_HORA = 3;

function hashDeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function enlaceRecuperacion(token: string): string {
  return `${URL_SITIO}/recuperar/${token}`;
}

/** Cuántos enlaces pidió este socio en la última hora. */
export async function solicitudesUltimaHora(usuarioId: number): Promise<number> {
  const desde = new Date(Date.now() - 60 * 60 * 1000);

  const filas = await db
    .select({ id: tokensRecuperacion.id })
    .from(tokensRecuperacion)
    .where(
      and(
        eq(tokensRecuperacion.usuarioId, usuarioId),
        gte(tokensRecuperacion.creadoEn, desde),
      ),
    );

  return filas.length;
}

/**
 * Crea un token nuevo y anula los que el socio tuviera pendientes.
 *
 * Devuelve el token en claro: es la única vez que existe fuera del correo. En
 * la base sólo queda su hash.
 */
export async function crearTokenRecuperacion(usuarioId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiraEn = new Date(Date.now() + MINUTOS_VIGENCIA * 60 * 1000);

  await db.transaction(async (tx) => {
    await anularTokensDe(usuarioId, tx);
    await tx.insert(tokensRecuperacion).values({
      usuarioId,
      tokenHash: hashDeToken(token),
      expiraEn,
    });
  });

  return token;
}

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Sella todos los tokens sin usar de un socio. */
export async function anularTokensDe(
  usuarioId: number,
  tx: Transaccion | typeof db = db,
): Promise<void> {
  await tx
    .update(tokensRecuperacion)
    .set({ usadoEn: new Date() })
    .where(
      and(
        eq(tokensRecuperacion.usuarioId, usuarioId),
        isNull(tokensRecuperacion.usadoEn),
      ),
    );
}

export type TokenVigente = { tokenId: number; usuario: Usuario };

/**
 * Busca un token que sirva: existe, no se usó, no venció, y su dueño sigue
 * activo. Cualquier fallo devuelve null, sin distinguir el motivo: a quien
 * llega con un enlace inválido no le sirve saber cuál de las cuatro condiciones
 * falló, y a quien está probando enlaces, menos.
 */
export async function buscarTokenVigente(
  token: string | undefined,
): Promise<TokenVigente | null> {
  if (!token) return null;

  const [fila] = await db
    .select({ tokenId: tokensRecuperacion.id, usuario: usuarios })
    .from(tokensRecuperacion)
    .innerJoin(usuarios, eq(usuarios.id, tokensRecuperacion.usuarioId))
    .where(
      and(
        eq(tokensRecuperacion.tokenHash, hashDeToken(token)),
        isNull(tokensRecuperacion.usadoEn),
        gt(tokensRecuperacion.expiraEn, new Date()),
        eq(usuarios.estado, "activo"),
      ),
    )
    .limit(1);

  return fila ?? null;
}
