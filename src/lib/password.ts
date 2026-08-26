import bcrypt from "bcryptjs";

const RONDAS = 12;

export function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, RONDAS);
}

export function verificarPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}

/**
 * Contraseña temporal para socios recién creados. Se excluyen los caracteres
 * ambiguos (l/1/I, O/0) porque estas claves se dictan o se escriben a mano.
 */
export function generarPasswordTemporal(largo = 10): string {
  const alfabeto = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}
