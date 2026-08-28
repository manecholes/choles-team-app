# CHOLES TEAM APP — Documento de Arquitectura

Plataforma de gestión deportiva para Choles Team, diseñada para evolucionar a **Choles Sports Platform** (SaaS multi-club).

## 1. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript |
| Backend | API Routes de Next.js (Node.js) — arquitectura de API REST, separable a un servicio Express independiente en el futuro |
| Base de datos | MySQL 8 (compatible XAMPP) |
| ORM | Prisma |
| Auth | JWT (access token 15 min) + refresh token (7 días, httpOnly cookie) + bcrypt |
| UI | Tailwind CSS + componentes propios |
| Iconos | lucide-react |
| Gráficas | Recharts |
| PDF | pdf-lib (recibos y reportes) |
| Excel/CSV | exceljs |
| Validación | zod |
| Almacenamiento de archivos | Adaptador local (`/storage`) con interfaz preparada para S3/cloud (`lib/storage.ts`) |

Se eligió Next.js API Routes en vez de un servidor Express separado para acelerar la entrega de un producto funcional único; la carpeta `src/server` aísla toda la lógica de negocio (services, repos) de las rutas HTTP, de modo que migrar a un backend Express/Nest independiente (o a PHP 8 si se requiere compatibilidad) sea un cambio de capa de transporte, no una reescritura de lógica.

## 2. Estructura de carpetas

```
choles-team-app/
├── README.md
├── .env.example
├── package.json
├── docs/
│   └── ARQUITECTURA.md
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── storage/                    # archivos subidos (documentos, fotos, logos) — local en dev
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/                # rutas protegidas, comparten layout+sidebar
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── jugadores/[...]/page.tsx
│   │   │   ├── categorias/page.tsx
│   │   │   ├── equipos/[...]/page.tsx
│   │   │   ├── entrenadores/page.tsx
│   │   │   ├── calendario/page.tsx
│   │   │   ├── entrenamientos/[...]/page.tsx
│   │   │   ├── partidos/[...]/page.tsx
│   │   │   ├── torneos/[...]/page.tsx
│   │   │   ├── pagos/[...]/page.tsx
│   │   │   ├── cartera/page.tsx
│   │   │   ├── comunicaciones/page.tsx
│   │   │   ├── rendimiento/[...]/page.tsx
│   │   │   ├── documentos/page.tsx
│   │   │   ├── reportes/page.tsx
│   │   │   ├── configuracion/page.tsx
│   │   │   └── mi-hijo/page.tsx        # vista simplificada para padres
│   │   └── api/
│   │       ├── auth/{login,refresh,logout,me}/route.ts
│   │       ├── players/[[...id]]/route.ts
│   │       ├── categories/[[...id]]/route.ts
│   │       ├── teams/[[...id]]/route.ts
│   │       ├── trainings/[[...id]]/route.ts
│   │       ├── attendance/route.ts
│   │       ├── matches/[[...id]]/route.ts
│   │       ├── tournaments/[[...id]]/route.ts
│   │       ├── payments/[[...id]]/route.ts
│   │       ├── receipts/[id]/pdf/route.ts
│   │       ├── communications/[[...id]]/route.ts
│   │       ├── evaluations/[[...id]]/route.ts
│   │       ├── documents/[[...id]]/route.ts
│   │       ├── reports/[type]/route.ts
│   │       ├── calendar/[[...id]]/route.ts
│   │       ├── clubs/[[...id]]/route.ts
│   │       └── dashboard/summary/route.ts
│   ├── components/            # UI compartida (Table, Modal, Card, Chart wrappers, Sidebar…)
│   ├── server/
│   │   ├── services/          # lógica de negocio por dominio (players.service.ts, payments.service.ts…)
│   │   ├── repositories/      # acceso a datos vía Prisma
│   │   └── validators/        # esquemas zod por módulo
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts            # firma/verificación JWT, hashing
│   │   ├── permissions.ts     # matriz de permisos por rol
│   │   ├── storage.ts         # adaptador de archivos (local hoy, S3 mañana)
│   │   └── pdf.ts / excel.ts
│   ├── middleware.ts          # protección de rutas + inyección de rol/club en request
│   └── types/
└── public/
```

## 3. Modelo de datos y relaciones (resumen)

Entidad raíz multi-tenant: **Club**. Prácticamente toda tabla operativa tiene `club_id` y todas las consultas se filtran por el club del usuario autenticado (aislamiento entre clubes, punto 23).

Grupos de tablas:

- **Identidad y control de acceso**: `clubs`, `users`, `roles`, `permissions`, `role_permissions`, `refresh_tokens`, `audit_logs`.
- **Personas**: `players`, `guardians`, `player_guardians` (N:N, permite varios tutores por jugador), `coaches`, `delegates`.
- **Estructura deportiva**: `categories`, `teams`, `team_players` (histórico de pertenencia a equipo por temporada), `seasons`.
- **Actividad**: `calendar_events`, `training_sessions`, `attendance`, `matches`, `match_statistics`.
- **Competición**: `tournaments`, `tournament_teams`, `tournament_groups`, `tournament_matches` (vínculo torneo↔match).
- **Finanzas**: `payment_concepts`, `payments`, `receipts`.
- **Comunicación**: `messages` (comunicados), `message_recipients`, `notifications`.
- **Rendimiento**: `evaluations` (sesión de evaluación), `physical_tests` (resultado por prueba), `performance_metrics` (serie temporal resumida para gráficos), `load_entries` (RPE × duración).
- **Documentos**: `documents`.
- **Configuración**: `settings` (clave/valor por club).

Relaciones clave:

- `Club 1—N Users, Players, Teams, Categories, Payments, Tournaments…` (aislamiento por club).
- `Player N—N Guardian` vía `player_guardians` (rol: madre/padre/tutor, contacto principal).
- `Player N—1 Category`, `Player N—N Team` vía `team_players` con `season_id` y fecha (permite historial de traspasos).
- `TrainingSession 1—N Attendance N—1 Player`.
- `Match 1—N MatchStatistic N—1 Player`.
- `Tournament 1—N TournamentGroup 1—N TournamentTeam`, `Tournament 1—N Match` (fixture).
- `Player 1—N Payment N—1 PaymentConcept`, `Payment 1—1 Receipt`.
- `Evaluation 1—N PhysicalTest`, `Player 1—N LoadEntry` (carga = RPE × duración, calculado en servicio, no en trigger, para mantenerlo portable).
- `User 1—1 Player|Coach|Delegate|Guardian` (un usuario de login se asocia opcionalmente a una de estas identidades funcionales; permite que el mismo login sirva a distintos roles sin duplicar tablas de personas).

El esquema completo con tipos y constraints vive en `prisma/schema.prisma` (siguiente entregable).

## 4. Roles y permisos

Modelo RBAC con tabla `permissions` granular (`recurso:accion`, p. ej. `players:write`, `payments:read_own`) agrupada en `roles`: `super_admin`, `admin`, `coach`, `delegate`, `guardian`, `player`. `lib/permissions.ts` centraliza la matriz para que el middleware, las rutas API y la UI (mostrar/ocultar botones) usen la misma fuente de verdad — evita que un permiso quede aplicado en el backend pero no reflejado en el frontend o viceversa.

Reglas de alcance (no solo "puede o no"):

- `admin`/`coach`/`delegate` sólo ven datos de su propio `club_id`.
- `coach` sólo ve/edita los equipos donde es entrenador asignado.
- `delegate` sólo ve su categoría/equipo asignado, y pagos sólo si tiene el permiso `payments:read_own` habilitado por el admin.
- `guardian` sólo ve jugadores vinculados en `player_guardians`.
- `player` sólo ve su propio registro.

## 5. Rutas API (contrato REST)

Convención: `GET/POST /api/<recurso>`, `GET/PUT/DELETE /api/<recurso>/<id>`. Todas exigen `Authorization: Bearer <access_token>` excepto `/api/auth/login` y `/api/auth/refresh`. Cada handler valida el body con zod, aplica el filtro de club/rol, y registra en `audit_logs` las operaciones de escritura sensibles (pagos, cambios de rol, eliminación de jugador).

Endpoints principales: auth (login/refresh/logout/me), players, categories, teams, coaches, delegates, guardians, calendar, trainings + `attendance` (POST masivo por sesión), matches + `match-statistics`, tournaments (+ `/generate-fixture`), payments + `payment-concepts` + `receipts/:id/pdf`, `reports/cartera` (con export), communications, evaluations + `physical-tests` + `load-entries`, documents (upload/list/delete), `dashboard/summary`, clubs (solo super_admin).

## 6. Pantallas principales

Login → Dashboard (según rol) → Sidebar con los 16 módulos del punto 20. Vista especial `mi-hijo` para `guardian` (tarjetas grandes: próximo entrenamiento, próximo partido, calendario, pagos, rendimiento, asistencia, comunicados) y vista simplificada de asistencia rápida para `coach` desde celular (lista de jugadores del equipo con 4 botones de estado).

## 7. Flujo de usuario (ejemplo administrador)

Login → Dashboard con alertas → clic en alerta "pagos vencidos" → Cartera filtrada → seleccionar jugador → registrar pago → generación automática de recibo PDF → notificación al padre → el padre ve el pago reflejado en `mi-hijo` y descarga el recibo.

Ejemplo entrenador: Login (celular) → Entrenamientos → seleccionar sesión de hoy → pasar asistencia (toque por jugador) → guardar → % de asistencia del equipo se recalcula al instante.

## 8. Riesgos técnicos identificados y mitigación

1. **Multi-tenancy con Prisma**: riesgo de fuga de datos entre clubes si se olvida el filtro `club_id` en una query. Mitigación: capa `repositories` que siempre exige `clubId` como primer argumento; no se permite `prisma.<model>.findMany` directo desde rutas.
2. **Concurrencia en fixtures de torneos**: generación de fixture debe ser determinística y transaccional (`prisma.$transaction`) para evitar partidos duplicados.
3. **Cálculo de asistencia/cartera en tiempo real** sobre muchos registros: se resuelve con agregaciones SQL (`groupBy`) en vez de traer todo a memoria.
4. **Password/documentación de credenciales demo**: el password del admin demo se documenta solo en `.env.example`/README de desarrollo y el sistema fuerza `mustChangePassword` en el primer login.
5. **Compatibilidad XAMPP/puerto MySQL variable**: `DATABASE_URL` se arma desde variables separadas (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) en `.env`, nunca hardcoded, para poder cambiar 3306↔3307 sin tocar código.
6. **Generación de PDF/Excel sin dependencias nativas pesadas**: se usan librerías puras JS (`pdf-lib`, `exceljs`) para evitar problemas de compilación nativa en Windows/XAMPP.
7. **Preparación para app móvil**: toda la lógica vive detrás de `/api`, sin dependencias de sesión basada en cookies para los endpoints de datos (el access token JWT es portable a un cliente móvil); solo el refresh token usa cookie httpOnly en web.
8. **Migración futura a SaaS**: el modelo ya es multi-club desde el día uno; “ir a SaaS” es exponer registro de clubes (ya modelado) y facturación, no remodelar la base de datos.

## 9. Alcance de esta entrega

Dado el tamaño del proyecto, se construyen con CRUD y lógica de negocio real contra la base de datos: autenticación/permisos, dashboard, jugadores, categorías, equipos, calendario, entrenamientos/asistencia, partidos/estadísticas, torneos/fixture, pagos/recibos/cartera, evaluaciones/rendimiento, comunicaciones básicas, documentos (metadata + storage local) y reportes exportables básicos. El esquema de base de datos, las migraciones y la matriz de permisos cubren el 100% del alcance del punto 21-23 para que cualquier módulo pendiente de pulir se construya sobre la misma base sin cambios estructurales.
