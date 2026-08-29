"use server";

import { revalidatePath } from "next/cache";

import { modoDemo } from "@/lib/demo";

/**
 * Devuelve la demostración a su estado inicial.
 *
 * Los datos ya se resiembran en cada ingreso; esto existe para quien está
 * probando y quiere volver a empezar sin cerrar la sesión.
 */
export async function accionReiniciarDemo(): Promise<void> {
  if (!modoDemo) return;

  const { sembrarDemo } = await import("@/db/semilla-demo");
  await sembrarDemo();

  revalidatePath("/", "layout");
}
