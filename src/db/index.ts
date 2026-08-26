import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type BD = NeonDatabase<typeof schema>;

/**
 * Se usa el driver WebSocket (y no el HTTP) porque soporta transacciones:
 * aprobar un préstamo o registrar un pago tocan dos tablas y deben ser atómicos.
 */
function crearConexion(): BD {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env.local y pega la cadena de conexión de Neon.",
    );
  }

  // El pool se cachea en globalThis para que el hot-reload de `next dev` no abra
  // una conexión nueva en cada recarga.
  const cache = globalThis as unknown as { __pool?: Pool };
  const pool = (cache.__pool ??= new Pool({ connectionString: url }));

  return drizzle(pool, { schema });
}

let conexion: BD | undefined;

/**
 * La conexión se crea en la primera consulta, no al importar el módulo. Así
 * `next build` puede recorrer todas las páginas sin necesitar la base de datos,
 * y si falta la variable de entorno el error aparece donde se entiende —al
 * consultar— y no como un fallo opaco de compilación.
 */
export const db = new Proxy({} as BD, {
  get(_destino, propiedad, receptor) {
    conexion ??= crearConexion();
    const valor = Reflect.get(conexion, propiedad, receptor);
    return typeof valor === "function" ? valor.bind(conexion) : valor;
  },
});

export { schema };
