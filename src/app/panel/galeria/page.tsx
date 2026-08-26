import Link from "next/link";
import Image from "next/image";
import { count, desc, eq, sql } from "drizzle-orm";
import { Images, Plus } from "lucide-react";

import { MAXIMO_CARRUSEL } from "@/lib/galeria";
import { db } from "@/db";
import { albumes, fotos } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { almacenamientoEsPersistente } from "@/lib/almacenamiento";
import { formatearFecha } from "@/lib/utils";
import { Aviso } from "@/components/ui/avisos";
import { BotonEnlace } from "@/components/ui/boton";
import { Insignia } from "@/components/ui/datos";
import { CabeceraPagina, Metrica, Tarjeta, Vacio } from "@/components/ui/superficie";

export const metadata = { title: "Galería" };

export default async function PaginaGaleriaPanel() {
  await requerirCapacidad("gestionarGaleria");

  const [lista, [{ enCarrusel }], [{ conPortada }]] = await Promise.all([
    db
      .select({
        album: albumes,
        // Sin interpolar las columnas: ver la nota en `consultas-galeria.ts`.
        // Interpoladas, la correlación queda sin calificar y compara la tabla
        // interna consigo misma.
        totalFotos: sql<number>`(
          select count(*)::int from fotos where fotos.album_id = albumes.id
        )`,
        portada: sql<string | null>`(
          select fotos.url from fotos
          where fotos.album_id = albumes.id
          order by fotos.es_portada_album desc, fotos.orden asc
          limit 1
        )`,
        sinPie: sql<number>`(
          select count(*)::int from fotos
          where fotos.album_id = albumes.id
            and (fotos.pie is null or fotos.pie = '')
        )`,
      })
      .from(albumes)
      .orderBy(desc(albumes.fecha), desc(albumes.id)),

    db.select({ enCarrusel: count() }).from(fotos).where(eq(fotos.enCarrusel, true)),
    db
      .select({ conPortada: count() })
      .from(fotos)
      .where(eq(fotos.esPortadaSitio, true)),
  ]);

  const publicados = lista.filter((a) => a.album.estado === "publicado").length;

  return (
    <>
      <CabeceraPagina
        titulo="Galería"
        descripcion="Los álbumes de fotos que se muestran en el sitio público."
      >
        <BotonEnlace href="/panel/galeria/nuevo">
          <Plus aria-hidden />
          Nuevo álbum
        </BotonEnlace>
      </CabeceraPagina>

      {!almacenamientoEsPersistente() && (
        <Aviso tono="atencion" titulo="Almacenamiento de desarrollo">
          No hay <code>BLOB_READ_WRITE_TOKEN</code> configurado, así que las fotos se
          guardan en el disco de este computador. Sirve para probar, pero esas fotos no
          existirán en el sitio publicado.
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metrica
          etiqueta="Álbumes"
          valor={lista.length}
          detalle={`${publicados} publicado(s)`}
          icono={<Images aria-hidden />}
        />
        <Metrica
          etiqueta="Fotos en el carrusel"
          valor={`${enCarrusel}/${MAXIMO_CARRUSEL}`}
          detalle={
            enCarrusel === 0
              ? "La portada usa el dibujo de la cordillera"
              : "Aparecen en la portada"
          }
          tono={enCarrusel === 0 ? "atencion" : "positivo"}
        />
        <Metrica
          etiqueta="Portada del sitio"
          valor={conPortada > 0 ? "Elegida" : "Sin elegir"}
          detalle={
            conPortada > 0 ? "Es el fondo del hero" : "Se usa la primera del carrusel"
          }
          tono={conPortada > 0 ? "positivo" : "neutro"}
        />
      </div>

      <Tarjeta>
        {lista.length === 0 ? (
          <Vacio
            icono={<Images aria-hidden />}
            titulo="Todavía no hay álbumes"
            descripcion="Crea el primero y sube las fotos de la última salida."
          >
            <BotonEnlace href="/panel/galeria/nuevo" variante="outline" tamano="sm">
              <Plus aria-hidden />
              Crear el primero
            </BotonEnlace>
          </Vacio>
        ) : (
          <ul className="divide-y divide-stone-100">
            {lista.map(({ album, totalFotos, portada, sinPie }) => (
              <li key={album.id}>
                <Link
                  href={`/panel/galeria/${album.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                    {portada && (
                      <Image
                        src={portada}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900">{album.titulo}</p>
                      <Insignia
                        tono={album.estado === "publicado" ? "exito" : "atencion"}
                      >
                        {album.estado === "publicado" ? "Publicado" : "Borrador"}
                      </Insignia>
                      {sinPie > 0 && (
                        <Insignia tono="atencion">{sinPie} sin pie</Insignia>
                      )}
                    </div>
                    <p className="text-sm text-stone-500">
                      {formatearFecha(album.fecha)}
                      {album.lugar ? ` · ${album.lugar}` : ""}
                    </p>
                  </div>

                  <span className="tabular shrink-0 text-sm text-stone-500">
                    {totalFotos} foto{totalFotos === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}
