import { eq } from "drizzle-orm";

import { siguienteOrden } from "@/lib/consultas-galeria";
import { db } from "@/db";
import { albumes, fotos } from "@/db/schema";
import { usuarioActual } from "@/lib/auth";
import { guardarArchivo } from "@/lib/almacenamiento";
import { puede } from "@/lib/permisos";

/**
 * Recibe UNA foto por llamada.
 *
 * El cliente las manda de a una, en fila, en vez de las diez juntas: cada
 * función de Vercel tiene un tope de tamaño de petición, y diez fotos en un
 * mismo envío lo rozarían. De paso, permite mostrar el avance real —"3 de 10"—
 * y que un archivo que falle no arrastre a los demás.
 *
 * La foto llega ya reducida desde el navegador (ver `comprimir` en el gestor):
 * lo que sube pesa unos 300 KB, no los 4 MB que trae del celular.
 */

const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const TAMANO_MAXIMO = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!puede(usuario.rol, "gestionarGaleria")) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  const formData = await request.formData();
  const albumId = Number(formData.get("albumId"));
  const archivo = formData.get("archivo");

  if (!Number.isInteger(albumId)) {
    return Response.json({ error: "Álbum no válido" }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return Response.json({ error: "No llegó ningún archivo" }, { status: 400 });
  }
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    return Response.json(
      { error: `Formato no admitido: ${archivo.type || "desconocido"}` },
      { status: 400 },
    );
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return Response.json(
      { error: "La foto es demasiado pesada incluso después de reducirla." },
      { status: 400 },
    );
  }

  const [album] = await db
    .select({ id: albumes.id })
    .from(albumes)
    .where(eq(albumes.id, albumId))
    .limit(1);

  if (!album) {
    return Response.json({ error: "El álbum no existe" }, { status: 404 });
  }

  const datos = Buffer.from(await archivo.arrayBuffer());
  const guardado = await guardarArchivo(archivo.name, datos, archivo.type);

  const ancho = Number(formData.get("ancho"));
  const alto = Number(formData.get("alto"));

  const [creada] = await db
    .insert(fotos)
    .values({
      albumId,
      url: guardado.url,
      rutaAlmacenamiento: guardado.ruta,
      ancho: Number.isFinite(ancho) && ancho > 0 ? ancho : null,
      alto: Number.isFinite(alto) && alto > 0 ? alto : null,
      orden: await siguienteOrden(albumId),
    })
    .returning({ id: fotos.id });

  return Response.json({ id: creada.id, url: guardado.url });
}
