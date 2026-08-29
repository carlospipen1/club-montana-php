import "server-only";
import { sql } from "drizzle-orm";

import { db } from "./index";
import {
  actas,
  asistencias,
  cuotasAnuales,
  cuotasMensuales,
  equipos,
  inscripciones,
  prestamos,
  reuniones,
  salidas,
  usuarios,
} from "./schema";
import { hashPassword } from "@/lib/password";
import { BASE_DEMO, PASSWORD_DEMO, modoDemo } from "@/lib/demo";

/**
 * Siembra la base de la demostración pública con datos inventados.
 *
 * BORRA TODAS LAS TABLAS antes de escribir. Por eso lo primero que hace es
 * negarse a correr fuera de un despliegue marcado con MODO_DEMO=1: si esto se
 * ejecutara por error contra la base del club, se llevaría por delante los
 * socios, las cuotas y las actas de verdad.
 */
export async function sembrarDemo(): Promise<void> {
  if (!modoDemo) {
    throw new Error(
      "sembrarDemo() solo puede ejecutarse con MODO_DEMO=1. Se abortó para no borrar datos reales.",
    );
  }

  // Segunda condición, independiente de la primera: la base tiene que llamarse
  // `club_demo`. Una variable de entorno mal puesta es un descuido plausible;
  // que además la cadena apunte a esa base concreta, no. Con las dos juntas,
  // esto no puede ejecutarse por accidente contra la base del club.
  const base = new URL(process.env.DATABASE_URL ?? "postgresql://nada/ninguna")
    .pathname.replace(/^\//, "")
    .split("?")[0];

  if (base !== BASE_DEMO) {
    throw new Error(
      `sembrarDemo() solo puede ejecutarse contra la base "${BASE_DEMO}", y esta cadena apunta a "${base}". Se abortó para no borrar datos reales.`,
    );
  }

  await db.execute(sql`
    truncate table
      notificaciones, fotos, albumes, actas,
      cuotas_mensuales, cuotas_anuales,
      asistencias, reuniones,
      inscripciones, salidas, prestamos, equipos, usuarios
    restart identity cascade
  `);

  // Una sola vez: bcrypt es caro y todas las cuentas comparten contraseña.
  const hash = await hashPassword(PASSWORD_DEMO);

  const personas = [
    ["admin@demo.cl", "Rosa", "Millán Paredes", "admin", false, "general"],
    ["tesorera@demo.cl", "Camila", "Fuentes Ríos", "tesorero", true, "general"],
    ["socio@demo.cl", "Diego", "Sepúlveda Lagos", "miembro", true, "general"],
    ["encargado@demo.cl", "Ignacio", "Vera Cortés", "encargado_equipo", true, "general"],
    ["tecnica@demo.cl", "Paula", "Riquelme Soto", "comision_tecnica", true, "general"],
    ["secretaria@demo.cl", "Elena", "Cárcamo Muñoz", "secretario", true, "general"],
    ["marcelo@demo.cl", "Marcelo", "Antileo Curín", "miembro", true, "general"],
    ["javiera@demo.cl", "Javiera", "Soto Alarcón", "miembro", true, "estudiante"],
    ["rodrigo@demo.cl", "Rodrigo", "Quintana Bravo", "miembro", true, "general"],
    ["fernanda@demo.cl", "Fernanda", "Huenchul Aros", "miembro", true, "estudiante"],
  ] as const;

  await db.insert(usuarios).values(
    personas.map(([email, nombres, apellidos, rol, esSocio, tipoMiembro], i) => ({
      email,
      passwordHash: hash,
      nombres,
      apellidos,
      rut: rutFicticio(11000000 + i * 111111),
      telefono: `+5699${String(1000000 + i * 34567).slice(0, 7)}`,
      // Repartidas entre los 25 y los 52 años, para que la columna de edad del
      // listado de socios muestre algo y no una fila de guiones.
      fechaNacimiento: `${1974 + i * 3}-0${(i % 9) + 1}-1${i % 9}`,
      fechaIngreso: `${2019 + (i % 6)}-03-15`,
      contactoEmergenciaNombre: "Contacto de prueba",
      contactoEmergenciaTelefono: "+56990000000",
      contactoEmergenciaRelacion: "Familiar",
      rol,
      esSocio,
      tipoMiembro,
      estado: "activo" as const,
    })),
  );

  /* --- Equipos y préstamos ------------------------------------------------ */

  await db.insert(equipos).values([
    {
      categoria: "Seguridad",
      nombre: "Casco Petzl Boreo",
      estado: "disponible",
      fechaAdquisicion: "2023-04-10",
    },
    {
      categoria: "Seguridad",
      nombre: "Arnés Black Diamond Momentum",
      estado: "prestado",
      fechaAdquisicion: "2023-04-10",
    },
    {
      categoria: "Seguridad",
      nombre: "Cuerda dinámica 60 m",
      estado: "disponible",
      fechaAdquisicion: "2022-11-02",
    },
    {
      categoria: "Nieve",
      nombre: "Crampones semiautomáticos",
      estado: "disponible",
      fechaAdquisicion: "2024-06-20",
    },
    {
      categoria: "Nieve",
      nombre: "Piolet clásico 60 cm",
      estado: "mantencion",
      fechaAdquisicion: "2021-08-01",
    },
    {
      categoria: "Campamento",
      nombre: "Carpa 3 estaciones, 2 personas",
      estado: "disponible",
      fechaAdquisicion: "2023-09-14",
    },
    {
      categoria: "Campamento",
      nombre: "Saco de dormir para -10 grados",
      estado: "disponible",
      fechaAdquisicion: "2023-09-14",
    },
    {
      categoria: "Campamento",
      nombre: "Hornilla a gas",
      estado: "disponible",
      fechaAdquisicion: "2022-05-30",
    },
  ]);

  await db.insert(prestamos).values([
    {
      equipoId: 2,
      usuarioId: 3,
      fechaDesde: "2026-08-20",
      fechaHasta: "2026-09-05",
      motivo: "Salida al volcán Lonquimay.",
      estado: "aprobado",
      aprobadoPor: 4,
      fechaAprobacion: new Date("2026-08-18T14:20:00Z"),
    },
    {
      equipoId: 6,
      usuarioId: 7,
      fechaDesde: "2026-06-12",
      fechaHasta: "2026-06-16",
      motivo: "Campamento en Malalcahuello.",
      estado: "devuelto",
      aprobadoPor: 4,
      fechaAprobacion: new Date("2026-06-10T18:00:00Z"),
      notaResolucion: "Devuelta en buen estado.",
    },
    {
      equipoId: 4,
      usuarioId: 8,
      fechaDesde: "2026-09-12",
      fechaHasta: "2026-09-15",
      motivo: "Primera salida a nieve, necesito crampones.",
      estado: "pendiente",
    },
  ]);

  /* --- Salidas e inscripciones -------------------------------------------- */

  await db.insert(salidas).values([
    {
      nombre: "Volcán Lonquimay",
      descripcion:
        "Ascenso por la ruta normal. Salida a las 5:00 desde la plaza. Se requiere experiencia previa en nieve.",
      fechaSalida: new Date("2026-09-13T08:00:00Z"),
      fechaLimiteInscripcion: new Date("2026-09-08T23:59:00Z"),
      lugar: "Malalcahuello, La Araucanía",
      nivelDificultad: "dificil",
      cupoMaximo: 15,
      equipoRequerido:
        "Crampones, piolet, casco, ropa de abrigo y raciones para el día.",
      encargadoId: 5,
      estado: "planificada",
    },
    {
      nombre: "Cerro Ñielol y alrededores",
      descripcion:
        "Caminata familiar de medio día, apta para quienes recién parten.",
      fechaSalida: new Date("2026-07-19T13:00:00Z"),
      fechaLimiteInscripcion: new Date("2026-07-16T23:59:00Z"),
      lugar: "Temuco",
      nivelDificultad: "facil",
      cupoMaximo: 25,
      encargadoId: 5,
      estado: "finalizada",
    },
  ]);

  await db.insert(inscripciones).values([
    { salidaId: 1, usuarioId: 3 },
    { salidaId: 1, usuarioId: 7 },
    { salidaId: 1, usuarioId: 9 },
    { salidaId: 2, usuarioId: 3, asistio: true },
    { salidaId: 2, usuarioId: 8, asistio: true },
    {
      salidaId: 2,
      usuarioId: 10,
      asistio: false,
      observaciones: "Avisó que no podía el día anterior.",
    },
  ]);

  /* --- Cuotas -------------------------------------------------------------- */

  await db.insert(cuotasAnuales).values([
    { anio: 2025, montoGeneral: 25000, montoEstudiante: 15000, creadoPor: 1 },
    { anio: 2026, montoGeneral: 30000, montoEstudiante: 18000, creadoPor: 1 },
  ]);

  const socios = personas
    .map((p, i) => ({ id: i + 1, esSocio: p[4], tipo: p[5] }))
    .filter((p) => p.esSocio);

  const filas = [];
  for (const { anio, general, estudiante } of [
    { anio: 2025, general: 25000, estudiante: 15000 },
    { anio: 2026, general: 30000, estudiante: 18000 },
  ]) {
    for (const socio of socios) {
      const monto = socio.tipo === "estudiante" ? estudiante : general;
      for (let mes = 1; mes <= 12; mes++) {
        // 2025 cerrado y pagado; 2026 al día hasta julio, con un moroso y un parcial.
        const pagado =
          anio === 2025 || (mes <= 7 && !(socio.id === 9 && mes >= 5));
        const parcial = anio === 2026 && socio.id === 10 && mes === 8;

        filas.push({
          anio,
          mes,
          usuarioId: socio.id,
          tipoMiembro: socio.tipo,
          montoEsperado: monto,
          montoPagado: pagado ? monto : parcial ? Math.round(monto / 2) : 0,
          estado: pagado
            ? ("pagado" as const)
            : parcial
              ? ("parcial" as const)
              : ("pendiente" as const),
          fechaPago:
            pagado || parcial
              ? `${anio}-${String(mes).padStart(2, "0")}-05`
              : null,
          registradoPor: pagado || parcial ? 2 : null,
        });
      }
    }
  }
  await db.insert(cuotasMensuales).values(filas);

  /* --- Reuniones y actas --------------------------------------------------- */

  await db.insert(reuniones).values([
    {
      tipo: "asamblea_ordinaria",
      titulo: "Asamblea ordinaria de marzo",
      fechaHora: new Date("2026-03-14T22:00:00Z"),
      lugar: "Sede del club",
      tabla: "1. Cuenta del ejercicio anterior.\n2. Cuota anual 2026.\n3. Renovación de carpas.",
      estado: "realizada",
      convocadaPor: 6,
      convocadaEn: new Date("2026-03-05T13:00:00Z"),
    },
    {
      tipo: "directiva",
      titulo: "Reunión de directiva de junio",
      fechaHora: new Date("2026-06-04T22:30:00Z"),
      lugar: "Sede del club",
      tabla: "1. Calendario del segundo semestre.\n2. Compra de un piolet.\n3. Plazos de devolución de equipo.",
      estado: "realizada",
      convocadaPor: 6,
      convocadaEn: new Date("2026-05-30T14:00:00Z"),
    },
    {
      tipo: "asamblea_extraordinaria",
      titulo: "Asamblea extraordinaria de agosto",
      fechaHora: new Date("2026-08-22T22:00:00Z"),
      lugar: "Sede del club",
      estado: "realizada",
      convocadaPor: 6,
      convocadaEn: new Date("2026-08-15T12:00:00Z"),
    },
    {
      // La que aún no ocurre: es la que se ve en el inicio de cada socio.
      tipo: "asamblea_ordinaria",
      titulo: "Asamblea ordinaria de septiembre",
      fechaHora: new Date("2026-09-18T22:30:00Z"),
      lugar: "Sede del club, Collipulli",
      tabla: "1. Balance del primer semestre.\n2. Calendario de salidas de primavera.\n3. Estado de la morosidad.\n4. Varios.",
      estado: "convocada",
      convocadaPor: 6,
      convocadaEn: new Date("2026-08-28T15:00:00Z"),
    },
  ]);

  // Asistencia de las dos primeras, como la deja quien redacta el acta.
  await db.insert(asistencias).values([
    ...[2, 3, 6, 7, 8, 9].map((usuarioId) => ({ reunionId: 1, usuarioId })),
    ...[2, 4, 5, 6].map((usuarioId) => ({ reunionId: 2, usuarioId })),
  ]);

  await db.insert(actas).values([
    {
      reunionId: 1,
      anio: 2026,
      numero: 1,
      tipo: "asamblea_ordinaria",
      titulo: "Asamblea ordinaria de marzo",
      fecha: "2026-03-14",
      lugar: "Sede del club",
      cuerpo:
        "Asisten 18 socios.\n\n1. Se aprueba la cuenta del ejercicio anterior.\n2. Se fija la cuota anual 2026 en $30.000 general y $18.000 estudiante.\n3. Se acuerda renovar dos carpas antes del invierno.\n\nAcuerdos: la tesorería informará el estado de morosidad en la próxima asamblea.",
      estado: "publicada",
      redactadaPor: 6,
      publicadaEn: new Date("2026-03-16T12:00:00Z"),
    },
    {
      reunionId: 2,
      anio: 2026,
      numero: 2,
      tipo: "directiva",
      titulo: "Reunión de directiva de junio",
      fecha: "2026-06-04",
      lugar: "Sede del club",
      cuerpo:
        "Asisten los cinco miembros de la directiva.\n\n1. Se revisa el calendario de salidas del segundo semestre.\n2. Se aprueba la compra de un piolet de reemplazo.\n3. Se recuerda que el equipo prestado debe devolverse dentro de los plazos comprometidos.",
      estado: "publicada",
      redactadaPor: 6,
      publicadaEn: new Date("2026-06-06T09:30:00Z"),
    },
    {
      reunionId: 3,
      anio: 2026,
      numero: 3,
      tipo: "asamblea_extraordinaria",
      titulo: "Asamblea extraordinaria de agosto",
      fecha: "2026-08-22",
      lugar: "Sede del club",
      cuerpo: "Borrador pendiente de revisión por la directiva.",
      estado: "borrador",
      redactadaPor: 6,
    },
  ]);
}

/** RUT ficticio con dígito verificador correcto, para que se vea plausible. */
function rutFicticio(numero: number): string {
  let suma = 0;
  let multiplo = 2;
  for (const digito of String(numero).split("").reverse()) {
    suma += Number(digito) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return `${numero}-${dv}`;
}
