/**
 * Levanta el sistema en modo demostración, contra la base `club_demo`.
 *
 * Existe porque `next dev` sólo lee `.env.local`, que apunta a la base del club:
 * sin esto, la única forma de probar la demostración era desplegarla. Carga
 * `.env.demo.local` y arranca Next en otro puerto, así el club y el demo pueden
 * correr en paralelo.
 */
import { spawn } from "node:child_process";
import { config } from "dotenv";

const { parsed, error } = config({ path: ".env.demo.local" });

if (error) {
  console.error(
    "No se pudo leer .env.demo.local. Necesita DATABASE_URL (la base club_demo), AUTH_SECRET y MODO_DEMO=1.",
  );
  process.exit(1);
}

const hijo = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--port", "3001"],
  {
    stdio: "inherit",
    // MODO_DEMO va primero para que el archivo pueda desactivarlo; las de
    // `.env.demo.local` van al final para que ganen sobre el ambiente heredado.
    env: { MODO_DEMO: "1", ...process.env, ...parsed },
  },
);

hijo.on("exit", (codigo) => process.exit(codigo ?? 0));
