/**
 * Dirección pública del sitio.
 *
 * Vive en un solo lugar porque se usa en dos contextos que no se hablan: los
 * metadatos de Open Graph y los enlaces absolutos de los correos, que no pueden
 * ser relativos porque se abren fuera del sitio. Si el dominio cambia, cambia
 * acá y en la variable de entorno, no en cinco archivos.
 */
export const URL_SITIO = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://clubdemontanacollipulli.cl"
).replace(/\/$/, "");
