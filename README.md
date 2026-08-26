# Club de Montaña Collipulli

Sitio público e intranet de socios del Club de Montaña Collipulli.

Reescritura completa del sistema anterior en PHP. Mantiene las mismas reglas de
negocio (socios, cuotas, equipos, préstamos, salidas, notificaciones) sobre una
base técnica que se puede desplegar, mantener y auditar.

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
   - `NEXT_PUBLIC_SITE_URL` (por ejemplo `https://clubmontanacollipulli.cl`)
4. **Deploy**.

Las migraciones se aplican desde tu computador con `npm run db:migrate` apuntando
a la `DATABASE_URL` de producción. No corren solas en el despliegue: así un error
de esquema nunca tumba el sitio en vivo.

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
    page.tsx              Sitio público (estático)
    login/                Ingreso a la intranet
    panel/                Intranet — todo lo de aquí exige sesión
      socios/  cuotas/  equipos/  prestamos/
      salidas/  notificaciones/  mi-actividad/
      perfil/  admin/
  actions/                Server Actions: toda la escritura pasa por aquí
  components/ui/          Sistema de diseño (botones, campos, tablas, modales)
  components/panel/       Armazón de la intranet
  db/
    schema.ts             Definición de las 8 tablas
    seed.ts               Creación del primer administrador
  lib/
    auth.ts               Sesión y control de acceso
    permisos.ts           Capacidades por rol
    rut.ts                Validación de RUT chileno (módulo 11)
  proxy.ts                Portero de /panel/* en el edge
drizzle/                  Migraciones SQL versionadas
legacy/                   Sistema PHP anterior — sólo referencia, se puede borrar
```

## Roles y permisos

Los permisos se declaran **por capacidad**, no por rol, en `src/lib/permisos.ts`.
Las pantallas preguntan por la capacidad; ninguna comprueba el rol a mano.

| Capacidad            | admin | presidente | tesorero | encargado_equipo | miembro |
| -------------------- | :---: | :--------: | :------: | :--------------: | :-----: |
| `verSocios`          |  ✓    |     ✓      |    ✓     |                  |         |
| `gestionarSocios`    |  ✓    |     ✓      |          |                  |         |
| `gestionarCuotas`    |  ✓    |     ✓      |    ✓     |                  |         |
| `gestionarEquipos`   |  ✓    |     ✓      |          |        ✓         |         |
| `gestionarPrestamos` |  ✓    |     ✓      |          |        ✓         |         |
| `gestionarSalidas`   |  ✓    |     ✓      |          |                  |         |
| `administrarSistema` |  ✓    |            |          |                  |         |

Todo socio activo puede, además: ver salidas e inscribirse, solicitar equipo,
consultar sus cuotas, y editar su perfil y contacto de emergencia.

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

- El correo de contacto y el teléfono de la landing son los del sistema anterior;
  hay que confirmarlos.
- Los testimonios conservan el texto original. Falta reemplazarlos por fotos y
  citas reales si el club las tiene.
- `public/logo.png` pesa 1,9 MB. Lo sirve `next/image` optimizado, pero conviene
  reemplazarlo por una versión de ~50 KB.
- No hay envío de correos: las notificaciones viven dentro de la intranet. Si se
  quiere avisar por mail, el siguiente paso natural es Resend.
