import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ImageOff, Send, Trash2, Undo2 } from "lucide-react";

import { accionEliminarAlbum, accionPublicarAlbum } from "@/actions/galeria";
import { MAXIMO_CARRUSEL } from "@/lib/galeria";
import { db } from "@/db";
import { albumes, fotos } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { formatearFecha } from "@/lib/utils";
import { ConfirmarEnvio } from "@/components/ui/acciones";
import { Aviso } from "@/components/ui/avisos";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/datos";
import {
  CabeceraPagina,
  Tarjeta,
  TarjetaCabecera,
  TarjetaCuerpo,
  Vacio,
} from "@/components/ui/superficie";
import { FormularioAlbum } from "../formulario";
import { FichaFoto, SubirFotos } from "./gestor";

export async function generateMetadata({ params }: PageProps<"/panel/galeria/[id]">) {
  const { id } = await params;
  const [album] = await db
    .select({ titulo: albumes.titulo })
    .from(albumes)
    .where(eq(albumes.id, Number(id)))
    .limit(1);

  return { title: album?.titulo ?? "Álbum" };
}

export default async function PaginaAlbumPanel({
  params,
}: PageProps<"/panel/galeria/[id]">) {
  await requerirCapacidad("gestionarGaleria");

  const { id } = await params;
  const albumId = Number(id);
  if (!Number.isInteger(albumId)) notFound();

  const [album] = await db
    .select()
    .from(albumes)
    .where(eq(albumes.id, albumId))
    .limit(1);

  if (!album) notFound();

  const [lista, [{ enCarrusel }]] = await Promise.all([
    db
      .select()
      .from(fotos)
      .where(eq(fotos.albumId, albumId))
      .orderBy(asc(fotos.orden), asc(fotos.id)),
    db.select({ enCarrusel: count() }).from(fotos).where(eq(fotos.enCarrusel, true)),
  ]);

  const sinPie = lista.filter((f) => !f.pie?.trim()).length;
  const publicado = album.estado === "publicado";

  return (
    <>
      <Link
        href="/panel/galeria"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Todos los álbumes
      </Link>

      <CabeceraPagina
        titulo={album.titulo}
        descripcion={`${formatearFecha(album.fecha)}${album.lugar ? ` · ${album.lugar}` : ""}`}
      >
        <Insignia tono={publicado ? "exito" : "atencion"}>
          {publicado ? "Publicado" : "Borrador"}
        </Insignia>
        {publicado && (
          <BotonEnlace href={`/galeria/${album.id}`} variante="outline" target="_blank">
            <ExternalLink aria-hidden />
            Ver en el sitio
          </BotonEnlace>
        )}
      </CabeceraPagina>

      {!publicado && (
        <Aviso tono="atencion" titulo="Borrador">
          Este álbum todavía no aparece en el sitio. Sube las fotos, escribe los pies y
          publícalo cuando esté listo.
        </Aviso>
      )}

      <Tarjeta>
        <TarjetaCabecera titulo="Subir fotos" />
        <TarjetaCuerpo>
          <SubirFotos albumId={album.id} />
        </TarjetaCuerpo>
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera
          titulo={`Fotos del álbum (${lista.length})`}
          descripcion={`${enCarrusel} de ${MAXIMO_CARRUSEL} lugares del carrusel ocupados${sinPie > 0 ? ` · ${sinPie} sin pie de foto` : ""}`}
        />
        {lista.length === 0 ? (
          <Vacio
            icono={<ImageOff aria-hidden />}
            titulo="Este álbum está vacío"
            descripcion="Arrastra las fotos al recuadro de arriba."
          />
        ) : (
          <ul className="space-y-4 px-5 py-4">
            {lista.map((foto, i) => (
              <FichaFoto
                key={foto.id}
                foto={foto}
                primera={i === 0}
                ultima={i === lista.length - 1}
                carruselLleno={enCarrusel >= MAXIMO_CARRUSEL}
              />
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera titulo="Datos del álbum" />
        <TarjetaCuerpo>
          <FormularioAlbum album={album} />
        </TarjetaCuerpo>
      </Tarjeta>

      <div className="flex flex-wrap items-center gap-2">
        <ConfirmarEnvio
          mensaje={
            publicado
              ? "¿Quitar el álbum del sitio? Dejará de verse para las visitas."
              : "¿Publicar este álbum? Quedará visible para cualquiera que entre al sitio."
          }
        >
          <form action={accionPublicarAlbum}>
            <input type="hidden" name="id" value={album.id} />
            <input type="hidden" name="publicar" value={publicado ? "0" : "1"} />
            <Boton type="submit" variante={publicado ? "outline" : "primary"}>
              {publicado ? <Undo2 aria-hidden /> : <Send aria-hidden />}
              {publicado ? "Volver a borrador" : "Publicar álbum"}
            </Boton>
          </form>
        </ConfirmarEnvio>

        <ConfirmarEnvio
          mensaje={`¿Eliminar "${album.titulo}" y sus ${lista.length} foto(s)? No se puede deshacer.`}
        >
          <form action={accionEliminarAlbum} className="ml-auto">
            <input type="hidden" name="id" value={album.id} />
            <Boton type="submit" variante="dangerOutline">
              <Trash2 aria-hidden />
              Eliminar álbum
            </Boton>
          </form>
        </ConfirmarEnvio>
      </div>
    </>
  );
}
