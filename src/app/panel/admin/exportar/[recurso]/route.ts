import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  cuotasMensuales,
  equipos,
  inscripciones,
  prestamos,
  salidas,
  usuarios,
} from "@/db/schema";
import { usuarioActual } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { calcularEdad, hoyISO, MESES } from "@/lib/utils";

/**
 * Exporta una tabla a CSV.
 *
 * Reemplaza al "backup" del sistema anterior, que copiaba el archivo .sqlite
 * dentro de la propia carpeta pública del sitio —es decir, dejaba toda la base
 * de datos descargable por cualquiera que adivinara la URL—. Acá el respaldo de
 * la base lo hace Neon (point-in-time recovery) y esto es sólo una exportación
 * para trabajar en planilla, protegida por rol.
 */

/** Escapa un valor según RFC 4180: comillas dobladas y campo entrecomillado. */
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = valor instanceof Date ? valor.toISOString() : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

function aCsv(cabeceras: string[], filas: unknown[][]): string {
  const lineas = [
    cabeceras.map(celda).join(","),
    ...filas.map((fila) => fila.map(celda).join(",")),
  ];
  // El BOM hace que Excel abra el archivo como UTF-8 y no rompa las tildes.
  return "﻿" + lineas.join("\r\n");
}

const RECURSOS = ["socios", "cuotas", "salidas", "prestamos", "equipos"] as const;
type Recurso = (typeof RECURSOS)[number];

export async function GET(
  _request: Request,
  { params }: RouteContext<"/panel/admin/exportar/[recurso]">,
) {
  const usuario = await usuarioActual();
  if (!usuario) return new Response("No autorizado", { status: 401 });

  const { recurso } = await params;
  if (!RECURSOS.includes(recurso as Recurso)) {
    return new Response("Recurso desconocido", { status: 404 });
  }

  // Las cuotas y los datos personales de los socios sólo los baja quien
  // administra esa información.
  const capacidad =
    recurso === "cuotas"
      ? "gestionarCuotas"
      : recurso === "socios"
        ? "verSocios"
        : "administrarSistema";

  if (!puede(usuario.rol, capacidad)) {
    return new Response("Sin permiso", { status: 403 });
  }

  let csv: string;

  switch (recurso as Recurso) {
    case "socios": {
      const filas = await db
        .select()
        .from(usuarios)
        .orderBy(asc(usuarios.apellidos), asc(usuarios.nombres));

      csv = aCsv(
        [
          "ID",
          "Apellidos",
          "Nombres",
          "RUT",
          "Email",
          "Teléfono",
          "Nacimiento",
          "Edad",
          "Tipo",
          "Rol",
          "Estado",
          "Es socio",
          "Ingreso",
          "Contacto emergencia",
          "Teléfono emergencia",
          "Relación",
        ],
        filas.map((u) => [
          u.id,
          u.apellidos,
          u.nombres,
          u.rut,
          u.email,
          u.telefono,
          u.fechaNacimiento,
          calcularEdad(u.fechaNacimiento),
          u.tipoMiembro,
          u.rol,
          u.estado,
          u.esSocio ? "sí" : "no (cuenta administrativa)",
          u.fechaIngreso,
          u.contactoEmergenciaNombre,
          u.contactoEmergenciaTelefono,
          u.contactoEmergenciaRelacion,
        ]),
      );
      break;
    }

    case "cuotas": {
      const filas = await db
        .select({ cuota: cuotasMensuales, socio: usuarios })
        .from(cuotasMensuales)
        .innerJoin(usuarios, eq(cuotasMensuales.usuarioId, usuarios.id))
        .orderBy(
          desc(cuotasMensuales.anio),
          asc(usuarios.apellidos),
          asc(cuotasMensuales.mes),
        );

      csv = aCsv(
        [
          "Año",
          "Mes",
          "Socio",
          "RUT",
          "Tipo",
          "Monto esperado",
          "Monto pagado",
          "Estado",
          "Fecha de pago",
          "Observaciones",
        ],
        filas.map(({ cuota, socio }) => [
          cuota.anio,
          MESES[cuota.mes - 1],
          `${socio.apellidos}, ${socio.nombres}`,
          socio.rut,
          cuota.tipoMiembro,
          cuota.montoEsperado,
          cuota.montoPagado,
          cuota.estado,
          cuota.fechaPago,
          cuota.observaciones,
        ]),
      );
      break;
    }

    case "salidas": {
      const filas = await db
        .select({
          salida: salidas,
          inscritos: inscripciones.id,
        })
        .from(salidas)
        .leftJoin(inscripciones, eq(inscripciones.salidaId, salidas.id))
        .orderBy(desc(salidas.fechaSalida));

      const conteo = new Map<number, number>();
      for (const f of filas) {
        if (f.inscritos !== null) {
          conteo.set(f.salida.id, (conteo.get(f.salida.id) ?? 0) + 1);
        }
      }
      const unicas = [...new Map(filas.map((f) => [f.salida.id, f.salida])).values()];

      csv = aCsv(
        ["ID", "Nombre", "Lugar", "Fecha", "Dificultad", "Cupo", "Inscritos", "Estado"],
        unicas.map((s) => [
          s.id,
          s.nombre,
          s.lugar,
          s.fechaSalida,
          s.nivelDificultad,
          s.cupoMaximo,
          conteo.get(s.id) ?? 0,
          s.estado,
        ]),
      );
      break;
    }

    case "prestamos": {
      const filas = await db
        .select({ prestamo: prestamos, equipo: equipos, socio: usuarios })
        .from(prestamos)
        .innerJoin(equipos, eq(prestamos.equipoId, equipos.id))
        .innerJoin(usuarios, eq(prestamos.usuarioId, usuarios.id))
        .orderBy(desc(prestamos.fechaSolicitud));

      csv = aCsv(
        [
          "ID",
          "Equipo",
          "Socio",
          "Solicitado",
          "Desde",
          "Hasta",
          "Motivo",
          "Estado",
          "Nota",
        ],
        filas.map(({ prestamo, equipo, socio }) => [
          prestamo.id,
          equipo.nombre,
          `${socio.apellidos}, ${socio.nombres}`,
          prestamo.fechaSolicitud,
          prestamo.fechaDesde,
          prestamo.fechaHasta,
          prestamo.motivo,
          prestamo.estado,
          prestamo.notaResolucion,
        ]),
      );
      break;
    }

    case "equipos": {
      const filas = await db
        .select()
        .from(equipos)
        .orderBy(asc(equipos.categoria), asc(equipos.nombre));

      csv = aCsv(
        ["ID", "Categoría", "Nombre", "Descripción", "Estado", "Adquisición"],
        filas.map((e) => [
          e.id,
          e.categoria,
          e.nombre,
          e.descripcion,
          e.estado,
          e.fechaAdquisicion,
        ]),
      );
      break;
    }
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${recurso}-${hoyISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
