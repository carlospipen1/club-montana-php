# Notas para trabajar en este proyecto

El `README.md` explica qué es el sistema y cómo levantarlo. Este archivo es otra
cosa: lo que hay que saber para **modificarlo sin repetir errores ya cometidos**.

## El entorno de este computador

Ni `node` ni `git` están en el PATH de PowerShell. Antes de cualquier comando:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
```

`git` sí funciona en Git Bash, que trae el suyo. No hay Python instalado: para
transformar archivos, usar Node o `perl`, no `python`.

## Convenciones

**Todo en español**: nombres de archivos, funciones, variables, tablas y columnas.
`accionCrearSocio`, `requerirCapacidad`, `cuotasMensuales`. Es coherente con el
dominio y con quien mantiene esto.

**Permisos por capacidad, nunca por rol.** Las pantallas preguntan
`puede(rol, "gestionarCuotas")`, jamás `rol === "tesorero"`. Todas las
capacidades viven en `src/lib/permisos.ts`. En el sistema PHP anterior la
comprobación estaba copiada en cada archivo y bastaba olvidar una para abrir un
agujero.

**La autorización se verifica en el servidor**, no escondiendo botones. Toda
server action empieza con `requerirCapacidad(...)` o `requerirUsuario()`.

**Los formularios siguen una forma única**: `EstadoFormulario` en
`src/actions/tipos.ts`, consumida con `useActionState`. Los errores van por campo
con la misma clave que el `name` del input.

## Reglas del dominio que no son obvias

**Un socio no es lo mismo que una cuenta.** La columna `esSocio` distingue a una
persona del club de una cuenta de operación. Una cuenta administrativa entra y
gestiona, pero no se le generan cuotas, no aparece en la tesorería y no cuenta en
el total de socios. Se resolvió así y no excluyendo por rol: un socio de verdad
puede además administrar el sistema, y atarlo a `rol = admin` lo habría dejado sin
pagar cuota sin que nadie lo decidiera.

Al desmarcar "Es socio del club" se retiran sus cuotas **impagas**. Las que tienen
un pago registrado se conservan: un pago es un hecho contable y no se borra por un
cambio de configuración.

**Los montos de cuota se copian, no se referencian.** Cada cuota mensual guarda el
monto que correspondía ese año. Subir la cuota no reescribe el pasado.

**Cambiar una contraseña tiene que mover `usuarios.sesionesDesde`.** La cookie es
un JWT de siete días que sólo lleva el id, así que sin eso quien tuviera una
sesión abierta sigue dentro con la contraseña vieja —y recuperar una cuenta
robada no serviría de nada—. Hoy lo hacen los tres lugares que tocan
`passwordHash`: el enlace de recuperación, el perfil y el reseteo de la
directiva. Si aparece un cuarto, tiene que hacerlo también. Cuando quien cambia
la contraseña es la propia persona, después hay que volver a llamar
`iniciarSesion()` o se expulsa sola.

**El token de sesión dice de qué despliegue viene.** `audienciaActual()` en
`session.ts` devuelve `club` o `demo` según `MODO_DEMO`, y va como `aud` del JWT;
`auth.ts` lo verifica. Sin eso, y si los dos proyectos compartieran
`AUTH_SECRET`, cualquiera entraría a la demostración —donde la contraseña está
impresa en pantalla— y su cookie serviría en el club. Consecuencia práctica:
cambiar `MODO_DEMO` en un despliegue invalida todas sus sesiones, y un tercer
despliegue necesita su propio valor de audiencia. El proxy no lo comprueba a
propósito: corre en el edge, donde `MODO_DEMO` no está garantizado.

**Una solicitud de préstamo no guarda su estado.** `solicitudes_prestamo`
guarda quién pide, para cuándo y para qué; el estado vive en cada fila de
`prestamos` y el de la solicitud se deduce de ellas. Si se guardara, habría que
decidir qué dice cuando se aprobaron cuatro equipos de cinco, y ese valor se
desincronizaría al resolver el quinto. Por lo mismo la resolución es **por
ítem**: si de un pedido hay una cosa comprometida, quien lleva los equipos
aprueba el resto en vez de rechazar todo y pedir que se mande de nuevo. Los
botones de "aprobar todo" mandan los mismos ids a la misma función; no son otro
camino.

**`equipos.estado` es la condición física, no la disponibilidad.** Vale
`disponible` o `mantencion` y nada más. Si un equipo está afuera, y hasta
cuándo, se deduce de sus préstamos aprobados y de las fechas de la solicitud. La
columna sólo sabía contestar "¿está afuera ahora?" cuando la pregunta del socio
siempre es "¿está libre del 12 al 15?", así que una carpa prestada hasta el 15
figuraba como no disponible para pedirla en noviembre. Lo único que impide
marcar un equipo en el listado es la mantención. `reservado` y `prestado` siguen
en el enum por las filas viejas —sacarlos obliga a recrear el tipo—, pero nada
los escribe. Ojo: un préstamo aprobado cuenta como vivo aunque su fecha ya haya
pasado; aprobado significa que salió y nadie registró la vuelta.

**Una solicitud pendiente no reserva nada.** Pedir sólo se frena contra lo ya
**aprobado**, que es equipo físicamente en manos de alguien. Que otro socio haya
pedido lo mismo no bloquea: a quién se le presta lo decide quien lleva los
equipos, no el orden en que llegaron los pedidos. Eso tiene dos consecuencias
que van juntas y no se pueden separar: la comprobación de choque **también
ocurre al aprobar** —ahí sí, o el mismo saco se compromete dos veces—, y la
pantalla de préstamos marca los equipos que pidió más de una persona, porque si
no quien resuelve aprueba el primero que ve y el segundo se vuelve imposible sin
que nadie entienda por qué.

**El choque de fechas se comprueba con las filas de `equipos` bloqueadas.**
Al pedir y al aprobar se hace `select ... for update` sobre los equipos
involucrados *antes* de buscar choques. Sin eso, dos operaciones simultáneas
pasaban las dos: cada una leía antes de que la otra escribiera.

**Las fotos se marcan, no se duplican.** Una foto pertenece a un álbum y tres
banderas deciden dónde sale: portada del sitio (una en todo el sistema), en el
carrusel (hasta 12) y portada del álbum.

## Trampas que ya nos costaron caro

### Subconsultas correlacionadas en Drizzle

**Nunca interpolar columnas del esquema dentro de una subconsulta.** Drizzle las
emite sin calificar la tabla:

```ts
// MAL: genera `where "album_id" = "id"`, que dentro de la subconsulta se
// resuelve como fotos.album_id = fotos.id. Devuelve un número plausible pero
// falso, sin error de SQL ni de tipos.
sql`(select count(*)::int from ${fotos} where ${fotos.albumId} = ${albumes.id})`

// BIEN: nombres completos, correlación inequívoca.
sql`(select count(*)::int from fotos where fotos.album_id = albumes.id)`
```

Este bug estuvo semanas en el conteo de inscritos por salida sin que nadie lo
notara, porque el número que devolvía parecía razonable.

### `db:generate` pide confirmación y acá no hay terminal

Cuando una tabla gana columnas y pierde otras en el mismo cambio, `drizzle-kit`
pregunta si se trata de un renombre, y sin TTY se cae con «Interactive prompts
require a TTY terminal». La salida es partirlo en dos migraciones: una que sólo
agrega —ahí se escribe a mano el relleno de los datos que ya existen— y otra que
recién entonces borra las columnas viejas y pone los `NOT NULL`. Así fue el paso
de préstamos sueltos a solicitudes (0008 y 0009), y el relleno del medio no lo
escribe `drizzle-kit`: sin él, el `NOT NULL` de la segunda falla.

### Archivos `"use server"`

Sólo pueden exportar funciones `async`. Exportar una constante rompe el módulo
entero y produce veinte errores de "export doesn't exist" que apuntan a otros
archivos. Las constantes van aparte (`src/lib/galeria.ts`), y las consultas de
lectura también (`src/lib/consultas-galeria.ts`).

### React 19 vacía los formularios

Al completar una server action, los campos no controlados se resetean. Si la
validación falla, la persona pierde todo lo escrito. Por eso las acciones
devuelven `valores` y los formularios los usan como `defaultValue`. Al agregar un
formulario nuevo, no olvidar esa parte.

### `cn()` y no plantillas de texto

Combinar clases de Tailwind concatenando strings deja las dos en conflicto en el
HTML y decide el orden del CSS, no el del código. Un botón quedó blanco sobre
blanco por eso. Usar siempre `cn()` de `src/lib/utils.ts`.

### El sitio público es dinámico a propósito

`export const dynamic = "force-dynamic"` en `src/app/(sitio)/layout.tsx`. No
quitarlo: prerenderizar obliga a que Neon responda durante el build, y una
variable marcada como sensible en Vercel no está disponible en esa etapa. El
despliegue falla entero.

## Al probar en el navegador

**Los eventos sintéticos no disparan los manejadores de React.** Un
`new Event('blur')` no activa `onBlur`, porque React escucha `focusout`. Perdí un
buen rato creyendo que el guardado de pies de foto estaba roto cuando funcionaba
bien. Para verificar de verdad: clic real, teclear, y `Tab` para salir del campo.

**El panel de vista previa a veces no compone frames.** Cuando las capturas de
pantalla fallan con "the Browser pane is not displayed", las imágenes con
`loading="lazy"` tampoco se cargan: sólo aparecen las que llevan `priority`. No
es un bug del sitio.

**Cuidado con las transiciones pendientes.** Tras una server action, los botones
quedan deshabilitados mientras se revalida. Hacer clic antes de que termine no
hace nada, y parece un fallo. Dar 3 o 4 segundos entre acciones.

**La restauración de scroll del navegador** pelea con las pruebas de carruseles.
`history.scrollRestoration = 'manual'` antes de medir.

**Desde esta conexión no se alcanza `*.vercel.app`.** El DNS entrega
216.198.79.3 y 64.29.17.3, y a esas dos IP el TCP no llega: timeout y 100% de
pérdida. La demostración no está caída —por cualquier otra IP anycast de Vercel
responde 200, y `clubdemontanacollipulli.cl` resuelve a otras—, así que no hay
que salir a buscar un despliegue roto. Para comprobarlo:

```bash
curl -o /dev/null -w '%{http_code}' --resolve club-demo-zeta.vercel.app:443:216.198.79.1 https://club-demo-zeta.vercel.app/
```

Y en Playwright, `args: ["--host-resolver-rules=MAP *.vercel.app 216.198.79.1"]`.

**Un error 500 en producción se lee con `npx vercel logs <host>`.** El navegador
sólo muestra «This page couldn't load» y un `digest`; el log trae la consulta,
los parámetros y el código de Postgres.

## Antes de dar algo por terminado

```powershell
npx tsc --noEmit    # tipos
npx eslint src      # linter
npm run build       # y revisar que las rutas salgan como se espera
```

Las migraciones **no** corren solas en el despliegue. Tras tocar
`src/db/schema.ts`:

```powershell
npm run db:generate
npm run db:migrate
```

## Despliegue

`main` es la rama de producción en Vercel; cada push despliega. La base es Neon y
el almacenamiento de fotos es Vercel Blob conectado por OIDC (sin token en las
variables del proyecto).

**Verificar siempre en qué rama se está antes de empujar.** Hubo un `git push
origin main` que decía "Everything up-to-date" porque el trabajo estaba en otra
rama.
