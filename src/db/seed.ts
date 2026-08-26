import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Crea la primera cuenta de administrador.
 *
 * A diferencia del `install.php` anterior —que era una página pública, sin
 * autenticación, que sembraba cinco cuentas con contraseñas impresas en la
 * pantalla de login— esto es un comando que se ejecuta desde la terminal y toma
 * la contraseña de una variable de entorno. Nada queda escrito en el repositorio.
 *
 *   npm run db:seed
 */
async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("./index");
  const { usuarios } = await import("./schema");
  const { hashPassword } = await import("../lib/password");

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const nombres = process.env.SEED_ADMIN_NOMBRES?.trim() || "Administrador";
  const apellidos = process.env.SEED_ADMIN_APELLIDOS?.trim() || "del Club";

  if (!email || !password) {
    throw new Error("Faltan SEED_ADMIN_EMAIL y/o SEED_ADMIN_PASSWORD en .env.local");
  }

  if (password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 10 caracteres.");
  }

  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);

  if (existente) {
    console.log(`El usuario ${email} ya existe (id ${existente.id}). No se hizo nada.`);
    return;
  }

  const [creado] = await db
    .insert(usuarios)
    .values({
      email,
      passwordHash: await hashPassword(password),
      nombres,
      apellidos,
      rol: "admin",
      tipoMiembro: "general",
      estado: "activo",
      fechaIngreso: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
      }).format(new Date()),
    })
    .returning({ id: usuarios.id });

  console.log(`Administrador creado: ${email} (id ${creado.id})`);
  console.log("Ya puedes entrar en /login con esa cuenta.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error al sembrar la base de datos:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
