"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Home,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  accionAlternarCarrusel,
  accionEliminarFoto,
  accionGuardarPie,
  accionMoverFoto,
  accionPortadaAlbum,
  accionPortadaSitio,
} from "@/actions/galeria";
import { Aviso } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { AreaTexto } from "@/components/ui/campos";
import { cn } from "@/lib/utils";
import type { Foto } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  Compresión en el navegador                                                 */
/* -------------------------------------------------------------------------- */

const LADO_MAXIMO = 2000;
const CALIDAD = 0.82;

/**
 * Reduce la foto antes de enviarla.
 *
 * Una foto de celular pesa 4 o 5 MB y tiene 4000 px de ancho; en pantalla no se
 * distingue de la misma a 2000 px y 300 KB. Comprimir aquí, en el equipo de
 * quien sube, hace que la subida sea diez veces más rápida, que el
 * almacenamiento rinda años en vez de meses, y que la página cargue liviana.
 *
 * Si algo falla —un formato que el navegador no sabe dibujar— se envía el
 * original y que decida el servidor: es preferible a perder la foto.
 */
async function comprimir(
  archivo: File,
): Promise<{ blob: Blob; ancho: number; alto: number }> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext("2d")?.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, "image/jpeg", CALIDAD),
    );

    if (!blob) throw new Error("El navegador no pudo generar la imagen");
    return { blob, ancho, alto };
  } catch {
    return { blob: archivo, ancho: 0, alto: 0 };
  }
}

/* -------------------------------------------------------------------------- */
/*  Subida                                                                     */
/* -------------------------------------------------------------------------- */

export function SubirFotos({ albumId }: { albumId: number }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(
    null,
  );
  const [errores, setErrores] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState(false);

  async function subir(lista: FileList | File[]) {
    const archivos = Array.from(lista).filter((a) => a.type.startsWith("image/"));
    if (archivos.length === 0) return;

    setErrores([]);
    setProgreso({ hecho: 0, total: archivos.length });
    const fallidos: string[] = [];

    // De una en una, no todas a la vez: así el avance es real y un archivo con
    // problemas no arrastra al resto.
    for (const [i, archivo] of archivos.entries()) {
      try {
        const { blob, ancho, alto } = await comprimir(archivo);
        const cuerpo = new FormData();
        cuerpo.set("albumId", String(albumId));
        cuerpo.set("archivo", new File([blob], archivo.name, { type: blob.type }));
        cuerpo.set("ancho", String(ancho));
        cuerpo.set("alto", String(alto));

        const respuesta = await fetch("/panel/galeria/subir", {
          method: "POST",
          body: cuerpo,
        });

        if (!respuesta.ok) {
          const { error } = await respuesta.json().catch(() => ({ error: "" }));
          // Ojo: sobre HTTP/2 —lo que usa Vercel— `statusText` viene siempre
          // vacío, así que como último recurso va el código numérico.
          fallidos.push(`${archivo.name}: ${error || `error ${respuesta.status}`}`);
        }
      } catch (error) {
        fallidos.push(`${archivo.name}: ${(error as Error).message}`);
      }
      setProgreso({ hecho: i + 1, total: archivos.length });
    }

    setErrores(fallidos);
    setProgreso(null);
    if (entrada.current) entrada.current.value = "";
    router.refresh();
  }

  const ocupado = progreso !== null;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (!ocupado) void subir(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          arrastrando
            ? "border-brand-500 bg-brand-50"
            : "border-stone-300 bg-stone-50/60",
        )}
      >
        {ocupado ? (
          <div className="space-y-3">
            <Loader2
              className="mx-auto size-6 animate-spin text-stone-400"
              aria-hidden
            />
            <p className="text-sm font-medium text-stone-700">
              Subiendo {progreso.hecho} de {progreso.total}…
            </p>
            <div className="mx-auto h-1.5 w-56 overflow-hidden rounded-full bg-stone-200">
              <div
                className="bg-brand-600 h-full transition-all"
                style={{ width: `${(progreso.hecho / progreso.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ImagePlus className="mx-auto size-7 text-stone-400" aria-hidden />
            <div>
              <p className="text-sm font-medium text-stone-800">
                Arrastra las fotos aquí
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                Se reducen solas antes de subir. JPG, PNG, WEBP o AVIF.
              </p>
            </div>
            <Boton
              type="button"
              variante="outline"
              onClick={() => entrada.current?.click()}
            >
              Elegir del computador
            </Boton>
          </div>
        )}

        <input
          ref={entrada}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void subir(e.target.files)}
        />
      </div>

      {errores.length > 0 && (
        <Aviso tono="error" titulo="Algunas fotos no se pudieron subir">
          <ul className="list-inside list-disc space-y-0.5">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Aviso>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Ficha de cada foto                                                         */
/* -------------------------------------------------------------------------- */

export function FichaFoto({
  foto,
  primera,
  ultima,
  carruselLleno,
}: {
  foto: Foto;
  primera: boolean;
  ultima: boolean;
  carruselLleno: boolean;
}) {
  const [pie, setPie] = useState(foto.pie ?? "");
  const [guardado, setGuardado] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const sinPie = pie.trim().length === 0;

  function guardarPie() {
    if (pie.trim() === (foto.pie ?? "").trim()) return;
    iniciar(async () => {
      const cuerpo = new FormData();
      cuerpo.set("id", String(foto.id));
      cuerpo.set("pie", pie);
      const r = await accionGuardarPie({}, cuerpo);
      setGuardado(r.ok ? "Guardado" : (r.mensaje ?? "No se pudo guardar"));
      setTimeout(() => setGuardado(null), 2000);
    });
  }

  function ejecutar(accion: (fd: FormData) => Promise<unknown>) {
    const cuerpo = new FormData();
    cuerpo.set("id", String(foto.id));
    iniciar(() => accion(cuerpo).then(() => undefined));
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row">
      <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:w-56">
        <Image
          src={foto.url}
          alt={foto.pie ?? ""}
          fill
          sizes="(max-width: 640px) 100vw, 224px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <label
            htmlFor={`pie-${foto.id}`}
            className="mb-1 block text-xs font-medium text-stone-600"
          >
            Pie de foto
          </label>
          <AreaTexto
            id={`pie-${foto.id}`}
            rows={2}
            value={pie}
            onChange={(e) => setPie(e.target.value)}
            onBlur={guardarPie}
            placeholder="Cumbre del Lonquimay, marzo de 2026"
            className="text-sm"
          />
          <div className="mt-1 flex items-center gap-2 text-xs">
            {sinPie ? (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <TriangleAlert className="size-3.5" aria-hidden />
                Sin pie: quien use lector de pantalla no sabrá qué muestra
              </span>
            ) : (
              <span className="text-stone-400">Se guarda al salir del campo</span>
            )}
            {guardado && <span className="text-emerald-700">{guardado}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Interruptor
            activo={foto.esPortadaSitio}
            icono={<Home aria-hidden />}
            etiqueta="Portada del sitio"
            deshabilitado={pendiente || foto.esPortadaSitio}
            onClick={() => ejecutar(accionPortadaSitio)}
          />

          <BotonCarrusel
            foto={foto}
            carruselLleno={carruselLleno}
            deshabilitado={pendiente}
          />

          <Interruptor
            activo={foto.esPortadaAlbum}
            icono={<Star aria-hidden />}
            etiqueta="Portada del álbum"
            deshabilitado={pendiente || foto.esPortadaAlbum}
            onClick={() => ejecutar(accionPortadaAlbum)}
          />

          <div className="ml-auto flex items-center gap-1">
            <Boton
              variante="ghost"
              tamano="sm"
              aria-label="Subir una posición"
              disabled={primera || pendiente}
              onClick={() => {
                const cuerpo = new FormData();
                cuerpo.set("id", String(foto.id));
                cuerpo.set("direccion", "arriba");
                iniciar(() => accionMoverFoto(cuerpo));
              }}
            >
              <ChevronUp aria-hidden />
            </Boton>
            <Boton
              variante="ghost"
              tamano="sm"
              aria-label="Bajar una posición"
              disabled={ultima || pendiente}
              onClick={() => {
                const cuerpo = new FormData();
                cuerpo.set("id", String(foto.id));
                cuerpo.set("direccion", "abajo");
                iniciar(() => accionMoverFoto(cuerpo));
              }}
            >
              <ChevronDown aria-hidden />
            </Boton>
            <Boton
              variante="ghost"
              tamano="sm"
              className="text-red-700 hover:bg-red-50"
              aria-label="Eliminar foto"
              disabled={pendiente}
              onClick={() => {
                const mensaje = foto.esPortadaSitio
                  ? "Esta foto es la portada del sitio. Si la eliminas, el hero pasará a usar la primera del carrusel. ¿Continuar?"
                  : "¿Eliminar esta foto? No se puede deshacer.";
                if (window.confirm(mensaje)) ejecutar(accionEliminarFoto);
              }}
            >
              <Trash2 aria-hidden />
            </Boton>
          </div>
        </div>
      </div>
    </li>
  );
}

function Interruptor({
  activo,
  icono,
  etiqueta,
  deshabilitado,
  onClick,
}: {
  activo: boolean;
  icono: React.ReactNode;
  etiqueta: string;
  deshabilitado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-pressed={activo}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 transition-colors [&_svg]:size-3.5",
        activo
          ? "bg-brand-700 ring-brand-700 text-white"
          : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50 disabled:opacity-50",
      )}
    >
      {icono}
      {etiqueta}
    </button>
  );
}

function BotonCarrusel({
  foto,
  carruselLleno,
  deshabilitado,
}: {
  foto: Foto;
  carruselLleno: boolean;
  deshabilitado: boolean;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const bloqueado = !foto.enCarrusel && carruselLleno;

  return (
    <span className="relative">
      <Interruptor
        activo={foto.enCarrusel}
        icono={<ImagePlus aria-hidden />}
        etiqueta={foto.enCarrusel ? "En el carrusel" : "Al carrusel"}
        deshabilitado={deshabilitado || pendiente || bloqueado}
        onClick={() =>
          iniciar(async () => {
            const cuerpo = new FormData();
            cuerpo.set("id", String(foto.id));
            const r = await accionAlternarCarrusel({}, cuerpo);
            if (!r.ok && r.mensaje) {
              setMensaje(r.mensaje);
              setTimeout(() => setMensaje(null), 4000);
            }
          })
        }
      />
      {(mensaje || bloqueado) && (
        <span className="absolute top-full left-0 z-10 mt-1 w-56 rounded-md bg-stone-900 px-2 py-1.5 text-xs text-white shadow-lg">
          {mensaje ?? "El carrusel está lleno. Quita una foto antes de agregar otra."}
        </span>
      )}
    </span>
  );
}
