# Club de Montaña Collipulli

Sitio público e intranet de socios del Club de Montaña Collipulli.

Reescritura completa del sistema anterior en PHP. Mantiene las mismas reglas de
negocio (socios, cuotas, equipos, préstamos, salidas, notificaciones) sobre una
base técnica que se puede desplegar, mantener y auditar, y suma lo que el club
fue pidiendo después: actas de reunión y una galería de fotos con mantenedor.

## Stack

| Pieza          | Elección                          | Por qué                                            |
| -------------- | --------------------------------- | -------------------------------------------------- |
| Framework      | Next.js 16 (App Router) + React 19 | Despliegue nativo en Vercel, sin configuración      |
| Lenguaje       | TypeScript                        | Los errores de datos aparecen al escribir, no en producción |
| Base de datos  | Postgres en Neon                  | Serverless, respaldos automáticos, plan gratuito generoso |
| Consultas      | Drizzle ORM                       | SQL tipado, migraciones versionadas                 |
| Autenticación  | Cookie de sesión firmada (`jose`) + bcrypt | Sin dependencias en beta; ~80 líneas legibles |
| Estilos        | Tailwind CSS 4                    | Un solo sistema de diseño para todo el sitio        |
| Lógica         | Server Actions                    | Sin API REST intermedia que mantener                |
| Validación     | Zod                               | La misma validación en el cliente y en el servidor  |

## Puesta en marcha

Necesitas Node.js 20 o superior.

### 1. Crear la base de datos

1. Entra a [console.neon.tech](https://console.neon.tech) y crea una cuenta.
2. Crea un proyecto (región recomendada: **AWS us-east-2** o la más cercana).
3. Copia la **connection string** que te muestra al terminar.

### 2. Configurar las variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

- `DATABASE_URL` — la cadena de conexión de Neon.
- `AUTH_SECRET` — genera uno con el comando de abajo. **Nunca lo compartas.**
- `SEED_ADMIN_*` — los datos de la primera cuenta de administrador.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Crear las tablas y el primer usuario

```bash
npm install
npm run db:migrate
npm run db:seed
```

`db:seed` crea **una sola** cuenta de administrador con la contraseña que pusiste
en `SEED_ADMIN_PASSWORD`. No hay usuarios de demostración ni contraseñas por
defecto.

### 4. Levantar el sitio

```bash
npm run dev
```

Abre <http://localhost:3000>. La intranet está en `/login`.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New** → **Project** → importa el repo.
   Next.js se detecta solo, no hay que configurar nada.
3. En **Settings → Environment Variables**, agrega para *Production*:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_SITE_URL` (por ejemplo `https://club-montana.vercel.app`)

   El almacenamiento de fotos no lleva variable: se conecta aparte (ver "La
   galería", más abajo).
4. **Deploy**.

Las migraciones se aplican desde tu computador con `npm run db:migrate` apuntando
a la `DATABASE_URL` de producción. No corren solas en el despliegue: así un error
de esquema nunca tumba el sitio en vivo.

## La galería

Las fotos no viven en el repositorio: se suben desde la intranet y se guardan en
**Vercel Blob**. Con unas diez fotos por salida y una salida al mes, comprimidas
a unos 300 KB, son 36 MB al año: el plan gratuito alcanza para muchos años.

### Activarla

1. En Vercel: **Storage** -> **Create** -> **Blob**, y **Connect to Project**.
   Con eso el sitio publicado queda listo: los proyectos conectados se autentican
   por OIDC —Vercel inyecta `BLOB_STORE_ID` y un token de vida corta— así que no
   hay que agregar ninguna variable a mano ni guardar secretos en el proyecto.
2. Para trabajar en tu computador, que no tiene OIDC, copia el
   `BLOB_READ_WRITE_TOKEN` desde la pestaña **.env.local** del store a tu
   archivo `.env.local`. Ese token es solo para desarrollo.

Sin ese token, en desarrollo las fotos se guardan en `public/subidas/` para poder
probar sin depender de un servicio externo. El mantenedor lo avisa en pantalla.
Ojo que la base de datos es la misma en local y en producción, así que una foto
subida así queda registrada con una URL que el sitio publicado no tiene.

### Cómo funciona

- Un **álbum** por salida, con su título, fecha y lugar. Nace como borrador y no
  se ve en el sitio hasta que se publica.
- La lista de álbumes vive en la portada, bajo "Lo que debes saber antes". No hay
  una página aparte: cada álbum sí abre la suya, que es donde están sus fotos.
- Las fotos se **reducen en el navegador** antes de subirse: de los 4 MB que trae
  el celular a unos 300 KB, sin pérdida visible en pantalla.
- Se suben **de a una**, en fila, para no rozar el tope de tamaño de petición de
  Vercel y poder mostrar el avance real.
- Tres marcas deciden dónde aparece cada foto: **portada del sitio** (una sola en
  todo el sistema, es el fondo del hero), **en el carrusel** (hasta 12) y
  **portada del álbum** (una por álbum).
- Si no hay ninguna portada elegida se usa la primera del carrusel; y si no hay
  carrusel, la portada dibuja una cordillera. Nunca queda rota.

## Comandos

| Comando               | Qué hace                                              |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo                                |
| `npm run build`       | Build de producción                                   |
| `npm run typecheck`   | Revisa los tipos sin compilar                         |
| `npm run lint`        | ESLint                                                |
| `npm run db:generate` | Genera el SQL de migración tras cambiar el esquema    |
| `npm run db:migrate`  | Aplica las migraciones pendientes                     |
| `npm run db:studio`   | Explorador visual de la base de datos                 |
| `npm run db:seed`     | Crea la primera cuenta de administrador               |

## Estructura

```
src/
  app/
    (sitio)/              Sitio público: comparte cabecera y pie
      page.tsx            Portada, con el carrusel y la lista de álbumes
      galeria/[id]/       Un álbum con todas sus fotos y el visor
    login/                Ingreso a la intranet
    panel/                Intranet — todo lo de aquí exige sesión
      socios/  cuotas/  equipos/  prestamos/  salidas/
      actas/  galeria/  notificaciones/  mi-actividad/
      perfil/  admin/
  actions/                Server Actions: toda la escritura pasa por aquí
  components/ui/          Sistema de diseño (botones, campos, tablas, modales)
  components/panel/       Armazón de la intranet
  components/landing/     Cabecera, pie, carrusel y visor del sitio público
  db/
    schema.ts             Definición de las 11 tablas
    seed.ts               Creación del primer administrador
  lib/
    auth.ts               Sesión y control de acceso
    permisos.ts           Capacidades por rol
    rut.ts                Validación de RUT chileno (módulo 11)
    almacenamiento.ts     Vercel Blob en producción, disco local en desarrollo
    consultas-galeria.ts  Lecturas públicas de álbumes y fotos
  proxy.ts                Portero de /panel/* en el edge
drizzle/                  Migraciones SQL versionadas
legacy/                   Sistema PHP anterior — sólo referencia, se puede borrar
```

## Roles y permisos

Los permisos se declaran **por capacidad**, no por rol, en `src/lib/permisos.ts`.
Las pantallas preguntan por la capacidad; ninguna comprueba el rol a mano.

| Capacidad            | admin | tesorero | encargado_equipo | comision_tecnica | secretario |
| -------------------- | :---: | :------: | :--------------: | :--------------: | :--------: |
| `verSocios`          |  ✓    |          |                  |                  |            |
| `gestionarSocios`    |  ✓    |          |                  |                  |            |
| `gestionarCuotas`    |  ✓    |    ✓     |                  |                  |            |
| `gestionarEquipos`   |  ✓    |          |        ✓         |                  |            |
| `gestionarPrestamos` |  ✓    |          |        ✓         |                  |            |
| `gestionarSalidas`   |  ✓    |          |                  |        ✓         |            |
| `gestionarActas`     |  ✓    |          |                  |                  |     ✓      |
| `gestionarGaleria`   |  ✓    |          |                  |                  |            |
| `administrarSistema` |  ✓    |          |                  |                  |            |

Los roles **presidente** y **miembro** no aparecen en la tabla porque no tienen
ninguna capacidad de gestión: el club decidió que la presidencia no administra el
sistema.

Lo que puede **cualquier socio activo**, sin permiso especial: ver las salidas e
inscribirse, solicitar equipo prestado, leer las actas publicadas, consultar sus
cuotas y editar su perfil y contacto de emergencia. Las columnas de la tabla son
sólo la administración, no la participación.

## Notas de seguridad

Cada punto corresponde a un problema real del sistema anterior:

- **Sin credenciales en el repositorio.** Todo secreto vive en variables de
  entorno; `.env.local` está en `.gitignore`.
- **Sin cuentas de demostración.** No existe un `install.php` público. La primera
  cuenta la crea `db:seed` desde la terminal, con una contraseña que eliges tú.
- **Contraseñas con bcrypt** (12 rondas). Las temporales se muestran una única vez
  y nunca se guardan en claro.
- **Sin SQL injection.** Drizzle parametriza todas las consultas; no se concatenan
  cadenas en SQL en ninguna parte.
- **Autorización verificada en el servidor** en cada acción, no sólo escondiendo
  botones. Las notificaciones y las cuotas comprueban además que el registro
  pertenezca a quien lo pide.
- **Sesión en cookie firmada** (`httpOnly`, `SameSite=Lax`, `Secure` en
  producción). El token guarda sólo el id: el rol y el estado se leen de la base
  en cada request, así que desactivar a un socio surte efecto de inmediato.
- **Sin CSRF.** Las Server Actions de Next validan el origen de cada envío.
- **Errores genéricos al ingresar.** No se revela si un correo existe, y se
  compara contra un hash señuelo para que el tiempo de respuesta no lo delate.

## Pendientes conocidos

- `public/logo.png` pesa 1,9 MB. Lo sirve `next/image` optimizado, pero conviene
  reemplazarlo por una versión de ~50 KB.
- No hay envío de correos: las notificaciones viven dentro de la intranet. Si se
  quiere avisar por mail, el siguiente paso natural es Resend. Sin eso, la
  contraseña de un socio nuevo hay que entregársela en persona y no existe un
  "olvidé mi contraseña" que no pase por el administrador.
- No hay límite de intentos en el ingreso. Para un club chico el riesgo es bajo,
  pero es una puerta abierta a probar contraseñas por fuerza bruta.
- Al reordenar fotos de un álbum se reescribe el orden de todas. Con diez fotos
  no se nota; con doscientas habría que pasar a arrastrar y guardar una sola vez.
