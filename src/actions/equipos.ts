"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  equipos,
  estadoEquipoEnum,
  prestamos,
  solicitudesPrestamo,
} from "@/db/schema";
import { requerirCapacidad, requerirUsuario } from "@/lib/auth";
import { CATEGORIAS_EQUIPO } from "@/lib/equipos";
import { notificarA, notificarAQuienesPueden } from "@/lib/notificar";
import { hoyISO } from "@/lib/utils";
import { errorDeValidacion, exito, fallo, type EstadoFormulario } from "./tipos";

/* -------------------------------------------------------------------------- */
/*  Inventario                                                                 */
/* -------------------------------------------------------------------------- */

const esquemaEquipo = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del equipo."),
  // Lista cerrada y compartida con el formulario: ver src/lib/equipos.ts.
  categoria: z.enum(CATEGORIAS_EQUIPO, "Elige una categoría de la lista."),
  descripcion: z.string().trim().optional(),
  estado: z.enum(estadoEquipoEnum.enumValues),
  fechaAdquisicion: z.string().trim().optional(),
});

export async function accionCrearEquipo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarEquipos");

  const parseado = esquemaEquipo.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db.insert(equipos).values({
    nombre: d.nombre,
    categoria: d.categoria,
    descripcion: d.descripcion || null,
    estado: d.estado,
    fechaAdquisicion: d.fechaAdquisicion || hoyISO(),
  });

  await notificarAQuienesPueden(
    "gestionarEquipos",
    {
      tipo: "equipo",
      titulo: "Nuevo equipo en el inventario",
      mensaje: `${autor.nombres} agregó "${d.nombre}" al inventario del club.`,
      enlace: "/panel/equipos",
    },
    autor.id,
  );

  revalidatePath("/panel/equipos");
  return exito(`"${d.nombre}" quedó en el inventario.`);
}

export async function accionActualizarEquipo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarEquipos");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fallo("Equipo no válido.", formData);

  const parseado = esquemaEquipo.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const d = parseado.data;

  await db
    .update(equipos)
    .set({
      nombre: d.nombre,
      categoria: d.categoria,
      descripcion: d.descripcion || null,
      estado: d.estado,
      fechaAdquisicion: d.fechaAdquisicion || null,
    })
    .where(eq(equipos.id, id));

  revalidatePath("/panel/equipos");
  return exito("Equipo actualizado.");
}

export async function accionEliminarEquipo(formData: FormData) {
  await requerirCapacidad("gestionarEquipos");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db.delete(equipos).where(eq(equipos.id, id));
  revalidatePath("/panel/equipos");
}

/* -------------------------------------------------------------------------- */
/*  Solicitud de préstamo                                                      */
/* -------------------------------------------------------------------------- */

/** "la carpa", "la carpa y el saco", "la carpa, el saco y las cintas". */
function listar(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

const esquemaSolicitud = z
  .object({
    // Llegan como varios campos con el mismo nombre, uno por casilla marcada.
    equipoIds: z
      .array(z.coerce.number().int().positive())
      .min(1, "Marca al menos un equipo antes de enviar el pedido.")
      .max(30, "Son demasiados equipos para un solo pedido."),
    fechaDesde: z.string().min(1, "Indica desde cuándo lo necesitas."),
    fechaHasta: z.string().min(1, "Indica hasta cuándo lo necesitas."),
    motivo: z.string().trim().min(5, "Cuenta brevemente para qué lo necesitas."),
  })
  .refine((d) => d.fechaHasta >= d.fechaDesde, {
    message: "La fecha de devolución no puede ser anterior a la de retiro.",
    path: ["fechaHasta"],
  })
  .refine((d) => d.fechaDesde >= hoyISO(), {
    message: "No puedes pedir un equipo para una fecha pasada.",
    path: ["fechaDesde"],
  });

export async function accionSolicitarPrestamo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();

  const parseado = esquemaSolicitud.safeParse({
    ...Object.fromEntries(formData),
    // `Object.fromEntries` se queda con el último de los campos repetidos, así
    // que los equipos hay que leerlos aparte o llegaría uno solo.
    equipoIds: formData.getAll("equipoId"),
  });
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { fechaDesde, fechaHasta, motivo } = parseado.data;
  // Marcar dos veces el mismo equipo no significa nada, y chocaría con el
  // índice único de la solicitud.
  const equipoIds = [...new Set(parseado.data.equipoIds)];

  const elegidos = await db
    .select({ id: equipos.id, nombre: equipos.nombre, estado: equipos.estado })
    .from(equipos)
    .where(inArray(equipos.id, equipoIds));

  if (elegidos.length !== equipoIds.length) {
    return fallo("Alguno de los equipos que marcaste ya no existe.", formData);
  }

  const enMantencion = elegidos.filter((e) => e.estado === "mantencion");
  if (enMantencion.length > 0) {
    const nombres = enMantencion.map((e) => e.nombre);
    return fallo(
      nombres.length === 1
        ? `${nombres[0]} está en mantención y no se puede prestar.`
        : `${listar(nombres)} están en mantención y no se pueden prestar.`,
      formData,
    );
  }

  let choque: string | null = null;
  let solicitudId = 0;

  try {
    await db.transaction(async (tx) => {
      // Se bloquean las filas de los equipos antes de mirar los choques. Sin
      // esto, dos socios pidiendo el mismo saco a la vez pasaban los dos: cada
      // uno leía la tabla antes de que el otro escribiera. Con el bloqueo, el
      // segundo espera, y recién entonces consulta y ve lo comprometido.
      await tx
        .select({ id: equipos.id })
        .from(equipos)
        .where(inArray(equipos.id, equipoIds))
        .for("update");

      // Dos rangos chocan si cada uno empieza antes de que el otro termine.
      // Las fechas viven en la solicitud, así que hay que cruzar las tablas.
      const comprometidos = await tx
        .select({ nombre: equipos.nombre })
        .from(prestamos)
        .innerJoin(
          solicitudesPrestamo,
          eq(prestamos.solicitudId, solicitudesPrestamo.id),
        )
        .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
        .where(
          and(
            inArray(prestamos.equipoId, equipoIds),
            inArray(prestamos.estado, ["pendiente", "aprobado"]),
            lte(solicitudesPrestamo.fechaDesde, fechaHasta),
            gte(solicitudesPrestamo.fechaHasta, fechaDesde),
          ),
        );

      if (comprometidos.length > 0) {
        const nombres = [...new Set(comprometidos.map((c) => c.nombre))];
        choque =
          nombres.length === 1
            ? `${nombres[0]} ya está comprometido en esas fechas. Sácalo del pedido o prueba con otro rango.`
            : `${listar(nombres)} ya están comprometidos en esas fechas. Sácalos del pedido o prueba con otro rango.`;
        // Nada escrito todavía: se sale sin dejar rastro.
        tx.rollback();
      }

      const [creada] = await tx
        .insert(solicitudesPrestamo)
        .values({ usuarioId: usuario.id, fechaDesde, fechaHasta, motivo })
        .returning({ id: solicitudesPrestamo.id });

      await tx
        .insert(prestamos)
        .values(equipoIds.map((equipoId) => ({ solicitudId: creada.id, equipoId })));

      solicitudId = creada.id;
    });
  } catch (error) {
    // `tx.rollback()` deshace la transacción lanzando: si el motivo fue el
    // choque de fechas, eso ya está contado y no es una falla.
    if (!choque) throw error;
  }

  if (choque) return fallo(choque, formData);

  // Un aviso por pedido y no uno por equipo: cinco cosas para una salida no son
  // cinco novedades para quien resuelve, son una.
  await notificarAQuienesPueden(
    "gestionarPrestamos",
    {
      tipo: "equipo",
      titulo: "Nueva solicitud de préstamo",
      mensaje: `${usuario.nombres} ${usuario.apellidos} pidió ${equipoIds.length === 1 ? "1 equipo" : `${equipoIds.length} equipos`} del ${fechaDesde} al ${fechaHasta}.`,
      enlace: `/panel/prestamos#solicitud-${solicitudId}`,
    },
    // Quien lleva los equipos también puede pedir equipo. Avisarse a sí mismo
    // de su propio pedido no le dice nada.
    usuario.id,
  );

  revalidarPrestamos();

  return exito(
    equipoIds.length === 1
      ? "Solicitud enviada. Te avisaremos cuando la revisen."
      : `Solicitud enviada con ${equipoIds.length} equipos. Te avisaremos cuando la revisen.`,
  );
}

/* -------------------------------------------------------------------------- */
/*  Resolución de préstamos                                                    */
/* -------------------------------------------------------------------------- */

type Decision = "aprobado" | "rechazado" | "devuelto";

/** Desde qué estado tiene sentido cada decisión. */
const ORIGEN: Record<Decision, "pendiente" | "aprobado"> = {
  aprobado: "pendiente",
  rechazado: "pendiente",
  devuelto: "aprobado",
};

/**
 * Aplica una decisión a un conjunto de ítems de una misma solicitud.
 *
 * Sirve para resolver uno solo o el pedido completo: la diferencia entre los
 * dos botones es qué ids llegan acá, no lo que pasa después. Los ítems que ya
 * no están en el estado de origen se ignoran —quien resuelve apretó "aprobar
 * todo" sobre una lista donde algo ya estaba rechazado—, y por eso lo que se
 * informa al socio es lo que efectivamente cambió.
 */
async function aplicarDecision(
  autorId: number,
  prestamoIds: number[],
  decision: Decision,
  nota: string | null,
) {
  const items = await db
    .select({
      id: prestamos.id,
      estado: prestamos.estado,
      equipoId: prestamos.equipoId,
      equipoNombre: equipos.nombre,
      usuarioId: solicitudesPrestamo.usuarioId,
    })
    .from(prestamos)
    .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
    .innerJoin(solicitudesPrestamo, eq(prestamos.solicitudId, solicitudesPrestamo.id))
    .where(inArray(prestamos.id, prestamoIds));

  const aplicables = items.filter((i) => i.estado === ORIGEN[decision]);
  if (aplicables.length === 0) return null;

  const ids = aplicables.map((i) => i.id);
  const equipoIds = aplicables.map((i) => i.equipoId);
  const ahora = new Date();

  // El préstamo y el estado del equipo cambian juntos o no cambian: si algo
  // falla a medio camino, no queda un equipo "prestado" sin préstamo asociado.
  await db.transaction(async (tx) => {
    await tx
      .update(prestamos)
      .set(
        decision === "devuelto"
          ? { estado: decision, devueltoPor: autorId, fechaDevolucion: ahora }
          : {
              estado: decision,
              resueltoPor: autorId,
              fechaResolucion: ahora,
              notaResolucion: nota,
            },
      )
      .where(inArray(prestamos.id, ids));

    // Rechazar no toca el equipo: la solicitud nunca lo bloqueó. Aprobar lo
    // marca prestado, y la devolución lo libera.
    if (decision === "aprobado") {
      await tx
        .update(equipos)
        .set({ estado: "prestado" })
        .where(inArray(equipos.id, equipoIds));
    } else if (decision === "devuelto") {
      await tx
        .update(equipos)
        .set({ estado: "disponible" })
        .where(inArray(equipos.id, equipoIds));
    }
  });

  return {
    usuarioId: aplicables[0].usuarioId,
    nombres: aplicables.map((i) => i.equipoNombre),
  };
}

/** Un aviso por resolución, sean uno o cinco equipos. */
async function avisarAlSocio(
  usuarioId: number,
  decision: Decision,
  nombres: string[],
  nota: string | null,
) {
  const lista = listar(nombres);

  const textos: Record<Decision, { titulo: string; mensaje: string }> = {
    aprobado: {
      titulo: "Tu préstamo fue aprobado",
      mensaje: `Puedes retirar ${lista}.`,
    },
    rechazado: {
      titulo:
        nombres.length === 1
          ? "Un equipo de tu solicitud fue rechazado"
          : "Parte de tu solicitud fue rechazada",
      mensaje: `No se aprobó el préstamo de ${lista}.${nota ? ` Motivo: ${nota}` : ""}`,
    },
    devuelto: {
      titulo: "Devolución registrada",
      mensaje: `Se registró la devolución de ${lista}. ¡Gracias!`,
    },
  };

  await notificarA(usuarioId, {
    tipo: "equipo",
    ...textos[decision],
    enlace: "/panel/mi-actividad",
  });
}

const esquemaResolucion = z.object({
  prestamoId: z.coerce.number().int().positive(),
  decision: z.enum(["aprobado", "rechazado", "devuelto"]),
  nota: z.string().trim().optional(),
});

export async function accionResolverPrestamo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarPrestamos");

  const parseado = esquemaResolucion.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { prestamoId, decision, nota } = parseado.data;

  const resultado = await aplicarDecision(
    autor.id,
    [prestamoId],
    decision,
    nota || null,
  );

  if (!resultado) {
    return fallo(
      decision === "devuelto"
        ? "Sólo se puede marcar como devuelto un equipo que esté prestado."
        : "Ese equipo ya fue resuelto.",
      formData,
    );
  }

  await avisarAlSocio(resultado.usuarioId, decision, resultado.nombres, nota || null);
  revalidarPrestamos();

  return exito(
    decision === "aprobado"
      ? "Préstamo aprobado."
      : decision === "rechazado"
        ? "Equipo rechazado."
        : "Devolución registrada.",
  );
}

const esquemaResolucionSolicitud = z.object({
  solicitudId: z.coerce.number().int().positive(),
  decision: z.enum(["aprobado", "rechazado", "devuelto"]),
  nota: z.string().trim().optional(),
});

/**
 * La misma decisión para todo lo que quede pendiente de un pedido.
 *
 * Es el caso normal —el equipo está, se presta entero— y sin esto habría que
 * apretar cinco veces el mismo botón. Lo que ya esté resuelto no se toca.
 */
export async function accionResolverSolicitud(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarPrestamos");

  const parseado = esquemaResolucionSolicitud.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { solicitudId, decision, nota } = parseado.data;

  const items = await db
    .select({ id: prestamos.id })
    .from(prestamos)
    .where(
      and(eq(prestamos.solicitudId, solicitudId), eq(prestamos.estado, ORIGEN[decision])),
    );

  if (items.length === 0) {
    return fallo("No queda nada por resolver en esa solicitud.", formData);
  }

  const resultado = await aplicarDecision(
    autor.id,
    items.map((i) => i.id),
    decision,
    nota || null,
  );

  if (!resultado) return fallo("No queda nada por resolver en esa solicitud.", formData);

  await avisarAlSocio(resultado.usuarioId, decision, resultado.nombres, nota || null);
  revalidarPrestamos();

  const cuantos = resultado.nombres.length;
  return exito(
    decision === "aprobado"
      ? `${cuantos === 1 ? "1 equipo aprobado" : `${cuantos} equipos aprobados`}.`
      : decision === "rechazado"
        ? `${cuantos === 1 ? "1 equipo rechazado" : `${cuantos} equipos rechazados`}.`
        : `${cuantos === 1 ? "1 devolución registrada" : `${cuantos} devoluciones registradas`}.`,
  );
}

function revalidarPrestamos() {
  revalidatePath("/panel/prestamos");
  revalidatePath("/panel/equipos");
  revalidatePath("/panel/mi-actividad");
}
