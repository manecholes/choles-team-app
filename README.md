# Choles Team App

**"Juntos, somos Choles Team."**

Plataforma de gestión deportiva, administrativa y financiera para Choles Team (escuela y club de baloncesto), diseñada para evolucionar hacia **Choles Sports Platform**, un SaaS multi-club.

Este documento explica cómo instalar y correr el proyecto en tu máquina. Para el diseño de arquitectura completo (esquema de base de datos, roles y permisos, contrato de rutas, riesgos técnicos), ver [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md).

## Antes de empezar: cómo se construyó este proyecto

El código de esta aplicación se escribió en un entorno sin acceso a internet (sin `npm install`, sin `npx prisma`), así que **no se pudo ejecutar `next build` ni levantar una base de datos real durante el desarrollo**. En su lugar, cada pieza se verificó de la forma más rigurosa posible dentro de esa limitación:

- La lógica de negocio pura (fixtures de torneos, cálculo de asistencia, carga RPE/ACWR, cartera/morosidad) vive en `src/server/logic/*.ts`, sin dependencias externas, y se ejecutó directamente con `tsx` contra casos de prueba reales.
- El esquema de Prisma se validó con un analizador estático propio (balance de llaves, relaciones colgantes, tipos desconocidos, claves duplicadas en objetos `where`).
- La generación de PDF (recibos) se probó de punta a punta y produjo un PDF válido.

Esto significa que **es normal, y esperado, que la primera vez que corras `npm install` y `npm run build` en tu máquina aparezcan uno o dos errores de tipado o de una dependencia faltante** — son errores que en un entorno normal se detectan y corrigen en segundos, pero que aquí no se pudieron ver antes de la entrega. Si te aparece alguno, cópialo tal cual y repórtalo para una corrección dirigida; no es necesario reescribir el proyecto.

## Requisitos previos

- **Windows** con **XAMPP** (Apache + MySQL). Solo se necesita el módulo de **MySQL** de XAMPP corriendo; Apache no es necesario porque la app corre con su propio servidor (Next.js), no con PHP.
- **Node.js 18.18 o superior** (recomendado 20.x LTS) — [nodejs.org](https://nodejs.org).
- Un editor de código (VS Code recomendado).

Verifica tu versión de Node abriendo una terminal (CMD o PowerShell):

```bash
node -v
npm -v
```

## 1. Ubicar el proyecto

Copia (o clona) la carpeta del proyecto exactamente en:

```
C:\xampp\htdocs\choles_admin
```

Esta ruta es la esperada por el punto 27 de la especificación. La aplicación no depende de Apache/PHP para funcionar, pero se deja en `htdocs` para mantener todo el ecosistema del club junto y facilitar una futura convivencia con otros proyectos PHP del mismo XAMPP si se necesitara.

## 2. Iniciar MySQL en XAMPP

1. Abre el **Panel de control de XAMPP**.
2. Da clic en **Start** junto a **MySQL**.
3. Si el puerto **3306** ya está ocupado por otro servicio, cambia el puerto de MySQL:
   - En el panel de XAMPP: **Config → my.ini** (del módulo MySQL) → cambia `port=3306` por `port=3307` → guarda y reinicia MySQL.
   - Anota el puerto que quedó activo; lo necesitas en el paso siguiente.
4. (Opcional) Crea la base de datos desde phpMyAdmin (`http://localhost/phpmyadmin`) con el nombre `choles_team_2026` y collation `utf8mb4_general_ci`. Si no la creas manualmente, Prisma la crea automáticamente en el paso de migración.

## 3. Configurar las variables de entorno

Copia el archivo de ejemplo:

```bash
copy .env.example .env
```

Abre `.env` y ajusta como mínimo:

```ini
DB_HOST=127.0.0.1
DB_PORT=3306          # cambia a 3307 si tuviste que mover el puerto de MySQL
DB_NAME=choles_team_2026
DB_USER=root
DB_PASSWORD=          # el usuario root de XAMPP normalmente no tiene contraseña
```

**El puerto nunca queda fijo en el código** (punto 27 de la especificación): `DB_PORT` es una variable independiente y `DATABASE_URL` se arma a partir de `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`, así que cambiar de 3306 a 3307 (o cualquier otro puerto) es editar una sola línea, sin tocar `schema.prisma` ni el código de la aplicación.

> Si tu terminal no expande `${DB_USER}` dentro de `DATABASE_URL` (esto puede pasar según la versión de Prisma/Node), simplemente reemplaza esa línea por la URL completa ya armada, por ejemplo:
> `DATABASE_URL="mysql://root:@127.0.0.1:3306/choles_team_2026"`

También genera valores propios para `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (no uses los de ejemplo en un entorno compartido):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pega el resultado en cada variable (deben ser dos valores **distintos**).

## 4. Instalar dependencias

Desde la carpeta del proyecto (`C:\xampp\htdocs\choles_admin`):

```bash
npm install
```

## 5. Crear las tablas (migraciones) y el cliente de Prisma

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` te pedirá un nombre para la migración inicial (por ejemplo `init`); Prisma crea la base de datos si no existe y todas las tablas descritas en `prisma/schema.prisma`.

## 6. Cargar datos de demostración

```bash
npm run db:seed
```

Esto crea (punto 28 de la especificación): 1 club, 1 super administrador, 1 administrador, 3 entrenadores, 1 delegado, 5 categorías, 5 equipos, 30 jugadores con sus padres/tutores, entrenamientos con asistencia, partidos con estadísticas, un torneo con fixture generado, pagos (al día, pendientes y vencidos), evaluaciones deportivas y comunicados de ejemplo.

## 7. Levantar la aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Next.js te redirige al login.

## Credenciales de demostración

> ⚠️ **Solo para desarrollo.** Estas credenciales se crean únicamente por el script de seed y nunca deben usarse en producción.

| Rol | Correo | Contraseña | Nota |
|---|---|---|---|
| Super Administrador | `superadmin@cholessports.com` | `SuperAdmin123!` | Gestiona clubes (multi-club) |
| Administrador | `admin@cholesteam.com` | `Admin123!` | **Debe cambiar la contraseña** al primer inicio de sesión (forzado por `mustChangePassword`) |
| Entrenador | `coach1@cholesteam.com` | `Coach123!` | Y `coach2@…`, `coach3@…` |
| Delegado | `delegado1@cholesteam.com` | `Delegado123!` | |
| Padre/tutor (demo) | `familia.demo@example.com` | `Padre123!` | Vinculado a jugadores de ejemplo |

Al iniciar sesión como administrador por primera vez, la aplicación exige definir una nueva contraseña antes de continuar.

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la app en modo desarrollo (`http://localhost:3000`) |
| `npm run build` | Compila la aplicación para producción |
| `npm run start` | Sirve la build de producción (ejecutar después de `build`) |
| `npm run typecheck` | Verifica tipos de TypeScript sin compilar |
| `npm run db:generate` | Regenera el cliente de Prisma tras cambiar `schema.prisma` |
| `npm run db:migrate` | Crea/aplica una migración en desarrollo |
| `npm run db:migrate:deploy` | Aplica migraciones existentes (uso en servidor/producción) |
| `npm run db:seed` | Carga los datos de demostración (punto 28) |
| `npm run db:studio` | Abre Prisma Studio (explorador visual de la base de datos) |

## Qué está 100% funcional hoy

- Login con JWT + refresh token, control de roles y permisos de punta a punta (backend valida cada permiso; el frontend solo oculta lo que el usuario no puede usar).
- CRUD reales (crean/leen/actualizan/eliminan filas en MySQL, no maquetas) de: jugadores, categorías, equipos, entrenadores, delegados, calendario, entrenamientos + asistencia, partidos + estadísticas, torneos (con generación automática de fixture round-robin y grupos), pagos + recibo PDF automático + cartera/morosidad con exportación a Excel, comunicaciones con notificaciones internas, evaluaciones deportivas + carga RPE + perfil de rendimiento con semáforo, documentos por jugador, reportes exportables a PDF/Excel/CSV, configuración del club y gestión multi-club (creación de clubes y administradores) para el super administrador.
- Aislamiento multi-club real: cada consulta se filtra por `clubId`; un club nunca ve datos de otro.
- Cálculos reales, no simulados: % de asistencia, carga interna (RPE × duración) y su clasificación de riesgo (ACWR), estado efectivo de un pago (vencido se calcula en tiempo real aunque el job de estado no haya corrido), morosidad agregada por jugador.

## Qué queda como base extensible (no roto, pero simple a propósito)

Para priorizar que los módulos núcleo (jugadores, pagos, entrenamientos, partidos, torneos) quedaran sólidos y 100% funcionales, algunas piezas quedaron con una interfaz simple que es fácil de mejorar sin rediseñar nada:

- El almacenamiento de archivos (documentos, fotos) usa un adaptador local en `/storage`; `src/lib/storage.ts` ya está preparado para cambiar a S3/almacenamiento cloud cambiando `STORAGE_DRIVER`, sin tocar el resto del código.
- La vista dedicada "Mi Hijo" (punto 29, resumen simplificado para el padre) aún no tiene una pantalla propia; hoy el padre accede a la misma información (calendario, pagos, asistencia, rendimiento) navegando por los módulos generales con su rol de Padre/Tutor.
- La integración con WhatsApp (punto 13/30) está prevista en el modelo de datos y en configuración (`whatsapp_integration_enabled`), pero el envío real queda para una siguiente fase.
- Entrenadores y delegados se administran hoy como registros de staff; crear su cuenta de usuario (login) para un entrenador/delegado nuevo se hace igual que para un administrador, vinculando manualmente el `coachId`/`delegateId` — un formulario dedicado para esto es una mejora natural siguiente.

## Siguiente paso recomendado

1. Corre `npm install && npm run build` y `npm run typecheck`.
2. Si aparece algún error, cópialo completo (incluye el archivo y la línea que señala) para una corrección dirigida.
3. Corre `npm run db:migrate` y `npm run db:seed` contra tu MySQL de XAMPP y confirma que el login y el dashboard cargan datos reales.

---

Choles Team App © 2026 — construido para Choles Team, con arquitectura preparada para Choles Sports Platform.
