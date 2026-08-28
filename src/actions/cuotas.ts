"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { cuotasAnuales, cuotasMensuales, usuarios } from "@/db/schema";
import { requerirCapacidad } from "@/lib/auth";
import { notificarA } from "@/lib/notificar";
import { formatearCLP, hoyISO, MESES } from "@/lib/utils";
import {
  errorDeValidacion,
  exito,
  fallo,
  falloDeCampo,
  type EstadoFormulario,
} from "./tipos";

const MESES_DEL_ANIO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/* -------------------------------------------------------------------------- */
/*  Habilitar un período anual                                                 */
/* -------------------------------------------------------------------------- */

const esquemaAnio = z.object({
  anio: z.coerce
    .number()
    .int()
    .min(2020, "El año parece incorrecto.")
    .max(2100, "El año parece incorrecto."),
  montoGeneral: z.coerce.number().int().min(0, "El monto no puede ser negativo."),
  montoEstudiante: z.coerce.number().int().min(0, "El monto no puede ser negativo."),
});

/**
 * Abre un año de cuotas y genera las 12 mensualidades de cada socio activo.
 *
 * Los montos quedan copiados en cada cuota, no referenciados: si el año que
 * viene sube la cuota, el historial de este año conserva lo que realmente
 * correspondía pagar. El sistema anterior tenía los montos escritos a mano
 * dentro de cuotas.php y reescribía el pasado al cambiarlos.
 */
export async function accionHabilitarAnio(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarCuotas");

  const parseado = esquemaAnio.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { anio, montoGeneral, montoEstudiante } = parseado.data;

  const [yaExiste] = await db
    .select({ id: cuotasAnuales.id })
    .from(cuotasAnuales)
    .where(eq(cuotasAnuales.anio, anio))
    .limit(1);

  if (yaExiste) {
    return fallo(
      `El año ${anio} ya está habilitado. Usa "Sincronizar socios".`,
      formData,
    );
  }

  const socios = await db
    .select({ id: usuarios.id, tipoMiembro: usuarios.tipoMiembro })
    .from(usuarios)
    // `esSocio` deja fuera a las cuentas administrativas: pueden entrar y
    // gestionar, pero no son personas que paguen cuota.
    .where(and(eq(usuarios.estado, "activo"), eq(usuarios.esSocio, true)));

  if (socios.length === 0) {
    return fallo("No hay socios activos a los que generarles cuotas.", formData);
  }

  await db.transaction(async (tx) => {
    await tx.insert(cuotasAnuales).values({
      anio,
      montoGeneral,
      montoEstudiante,
      creadoPor: autor.id,
    });

    const filas = socios.flatMap((socio) =>
      MESES_DEL_ANIO.map((mes) => ({
        anio,
        mes,
        usuarioId: socio.id,
        tipoMiembro: socio.tipoMiembro,
        montoEsperado:
          socio.tipoMiembro === "estudiante" ? montoEstudiante : montoGeneral,
      })),
    );

    await tx.insert(cuotasMensuales).values(filas);
  });

  revalidatePath("/panel/cuotas");
  revalidatePath("/panel");

  return exito(
    `Año ${anio} habilitado: ${socios.length} socio(s) × 12 meses. General ${formatearCLP(montoGeneral)}, estudiante ${formatearCLP(montoEstudiante)}.`,
  );
}

/**
 * Genera las cuotas faltantes de un año ya habilitado, para los socios que
 * entraron al club después de abrirlo.
 */
export async function accionSincronizarSocios(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirCapacidad("gestionarCuotas");

  const anio = Number(formData.get("anio"));
  if (!Number.isInteger(anio)) return fallo("Año no válido.", formData);

  const [periodo] = await db
    .select()
    .from(cuotasAnuales)
    .where(eq(cuotasAnuales.anio, anio))
    .limit(1);

  if (!periodo) return fallo(`El año ${anio} no está habilitado.`, formData);

  const socios = await db
    .select({ id: usuarios.id, tipoMiembro: usuarios.tipoMiembro })
    .from(usuarios)
    // `esSocio` deja fuera a las cuentas administrativas: pueden entrar y
    // gestionar, pero no son personas que paguen cuota.
    .where(and(eq(usuarios.estado, "activo"), eq(usuarios.esSocio, true)));

  const existentes = await db
    .select({ usuarioId: cuotasMensuales.usuarioId, mes: cuotasMensuales.mes })
    .from(cuotasMensuales)
    .where(eq(cuotasMensuales.anio, anio));

  const yaTiene = new Set(existentes.map((c) => `${c.usuarioId}-${c.mes}`));

  const faltantes = socios.flatMap((socio) =>
    MESES_DEL_ANIO.filter((mes) => !yaTiene.has(`${socio.id}-${mes}`)).map((mes) => ({
      anio,
      mes,
      usuarioId: socio.id,
      tipoMiembro: socio.tipoMiembro,
      montoEsperado:
        socio.tipoMiembro === "estudiante"
          ? periodo.montoEstudiante
          : periodo.montoGeneral,
    })),
  );

  if (faltantes.length === 0) {
    return exito("Todos los socios activos ya tienen sus cuotas del año.");
  }

  await db.insert(cuotasMensuales).values(faltantes);

  revalidatePath("/panel/cuotas");
  return exito(`Se generaron ${faltantes.length} cuota(s) faltante(s).`);
}

/* -------------------------------------------------------------------------- */
/*  Registro de pagos                                                          */
/* -------------------------------------------------------------------------- */

const esquemaPago = z.object({
  cuotaId: z.coerce.number().int().positive(),
  montoPagado: z.coerce.number().int().min(0, "El monto no puede ser negativo."),
  fechaPago: z.string().optional(),
  observaciones: z.string().trim().optional(),
});

export async function accionRegistrarPago(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await requerirCapacidad("gestionarCuotas");

  const parseado = esquemaPago.safeParse(Object.fromEntries(formData));
  if (!parseado.success) return errorDeValidacion(parseado.error, formData);

  const { cuotaId, montoPagado, fechaPago, observaciones } = parseado.data;

  const [cuota] = await db
    .select()
    .from(cuotasMensuales)
    .where(eq(cuotasMensuales.id, cuotaId))
    .limit(1);

  if (!cuota) return fallo("La cuota no existe.", formData);

  if (montoPagado > cuota.montoEsperado) {
    return falloDeCampo(
      {
        montoPagado: [
          `No puede superar los ${formatearCLP(cuota.montoEsperado)} de la cuota.`,
        ],
      },
      formData,
    );
  }

  const estado =
    montoPagado === 0
      ? "pendiente"
      : montoPagado >= cuota.montoEsperado
        ? "pagado"
        : "parcial";

  await db
    .update(cuotasMensuales)
    .set({
      montoPagado,
      estado,
      fechaPago: montoPagado > 0 ? fechaPago || hoyISO() : null,
      observaciones: observaciones || null,
      registradoPor: autor.id,
      actualizadoEn: new Date(),
    })
    .where(eq(cuotasMensuales.id, cuotaId));

  if (estado === "pagado" && cuota.estado !== "pagado") {
    await notificarA(cuota.usuarioId, {
      tipo: "cuota",
      titulo: "Pago registrado",
      mensaje: `Se registró el pago de tu cuota de ${MESES[cuota.mes - 1]} ${cuota.anio}.`,
      enlace: "/panel/cuotas",
    });
  }

  revalidatePath("/panel/cuotas");
  revalidatePath("/panel");
  revalidatePath("/panel/mi-actividad");

  return exito(`${MESES[cuota.mes - 1]} actualizado.`);
}

/** Marca de una vez todas las cuotas pendientes de un socio en un año. */
export async function accionMarcarAnioPagado(formData: FormData) {
  const autor = await requerirCapacidad("gestionarCuotas");

  const usuarioId = Number(formData.get("usuarioId"));
  const anio = Number(formData.get("anio"));
  if (!Number.isInteger(usuarioId) || !Number.isInteger(anio)) return;

  const pendientes = await db
    .select({ id: cuotasMensuales.id, montoEsperado: cuotasMensuales.montoEsperado })
    .from(cuotasMensuales)
    .where(
      and(
        eq(cuotasMensuales.usuarioId, usuarioId),
        eq(cuotasMensuales.anio, anio),
        inArray(cuotasMensuales.estado, ["pendiente", "parcial"]),
      ),
    );

  if (pendientes.length === 0) return;

  await db.transaction(async (tx) => {
    for (const cuota of pendientes) {
      await tx
        .update(cuotasMensuales)
        .set({
          montoPagado: cuota.montoEsperado,
          estado: "pagado",
          fechaPago: hoyISO(),
          registradoPor: autor.id,
          actualizadoEn: new Date(),
        })
        .where(eq(cuotasMensuales.id, cuota.id));
    }
  });

  await notificarA(usuarioId, {
    tipo: "cuota",
    titulo: "Cuotas al día",
    mensaje: `Se registró el pago de todas tus cuotas pendientes del ${anio}.`,
    enlace: "/panel/cuotas",
  });

  revalidatePath("/panel/cuotas");
  revalidatePath("/panel");
}
