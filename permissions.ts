import type { UserRole } from "@prisma/client";

/**
 * Matriz de permisos por rol (punto 3 del maestro).
 *
 * Formato de cada permiso: "<recurso>:<accion>".
 * "*" como recurso o como matriz completa = acceso total (solo SUPER_ADMIN).
 *
 * Esta matriz es la UNICA fuente de verdad para autorizacion en toda la app:
 * las rutas de API la usan para devolver 403, y la UI (sidebar, botones) la
 * usa para mostrar/ocultar acciones. Mantenerla centralizada evita que un
 * permiso quede aplicado en el backend pero visible en el frontend (o
 * viceversa).
 *
 * Las tablas `roles`/`permissions` en la base de datos existen para que en
 * el futuro un super_admin pueda personalizar esta matriz desde la UI de
 * Configuracion; hoy la aplicacion valida contra esta constante estatica.
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],

  ADMIN: [
    "dashboard:read",
    "players:read",
    "players:write",
    "players:delete",
    "guardians:read",
    "guardians:write",
    "coaches:read",
    "coaches:write",
    "delegates:read",
    "delegates:write",
    "categories:read",
    "categories:write",
    "categories:delete",
    "teams:read",
    "teams:write",
    "teams:delete",
    "calendar:read",
    "calendar:write",
    "trainings:read",
    "trainings:write",
    "attendance:read",
    "attendance:write",
    "matches:read",
    "matches:write",
    "tournaments:read",
    "tournaments:write",
    "payments:read",
    "payments:write",
    "cartera:read",
    "cartera:export",
    "communications:read",
    "communications:write",
    "evaluations:read",
    "evaluations:write",
    "documents:read",
    "documents:write",
    "reports:read",
    "reports:export",
    "settings:read",
    "settings:write",
  ],

  COACH: [
    "dashboard:read",
    "players:read",
    "teams:read_own",
    "calendar:read",
    "trainings:read_own",
    "trainings:write_own",
    "attendance:read_own",
    "attendance:write_own",
    "matches:read_own",
    "matches:write_own",
    "evaluations:read_own",
    "evaluations:write_own",
  ],

  DELEGATE: [
    "dashboard:read",
    "players:read_own",
    "teams:read_own",
    "calendar:read",
    "payments:read_own", // habilitable por admin (ver seccion 3 - "segun permisos")
  ],

  GUARDIAN: [
    "children:read",
    "calendar:read",
    "trainings:read_own",
    "matches:read_own",
    "tournaments:read",
    "attendance:read_own",
    "payments:read_own",
    "receipts:read_own",
    "communications:read_own",
    "evaluations:read_own_authorized",
  ],

  PLAYER: [
    "calendar:read",
    "trainings:read_own",
    "matches:read_own",
    "statistics:read_own",
    "evaluations:read_own_authorized",
  ],
};

export function can(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

/**
 * Verdadero si el rol tiene ALGUN permiso sobre el recurso indicado,
 * sin importar el sufijo de alcance (":read", ":read_own", ":write_own"...).
 * Util para decidir si se muestra un item del sidebar o una seccion completa.
 */
export function hasResourceAccess(role: UserRole, resource: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  return perms.some((p) => p.startsWith(`${resource}:`));
}

export function canAny(role: UserRole, permissions: string[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** Roles que administran el club completo (no solo su propio equipo/hijo). */
export const CLUB_MANAGEMENT_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

/**
 * Items del sidebar principal (punto 20). `resource` se valida con
 * hasResourceAccess() para decidir si el item se muestra, sin importar el
 * sufijo de alcance que tenga el rol sobre ese recurso.
 */
export const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: string;
  resource: string;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", resource: "dashboard" },
  { href: "/mi-hijo", label: "Mi Hijo", icon: "Heart", resource: "children" },
  { href: "/jugadores", label: "Jugadores", icon: "Users", resource: "players" },
  { href: "/equipos", label: "Equipos", icon: "Shirt", resource: "teams" },
  { href: "/categorias", label: "Categorias", icon: "ListTree", resource: "categories" },
  { href: "/entrenadores", label: "Entrenadores", icon: "UserCog", resource: "coaches" },
  { href: "/delegados", label: "Delegados", icon: "UserCheck", resource: "delegates" },
  { href: "/calendario", label: "Calendario", icon: "Calendar", resource: "calendar" },
  { href: "/entrenamientos", label: "Entrenamientos", icon: "Dumbbell", resource: "trainings" },
  { href: "/partidos", label: "Partidos", icon: "Trophy", resource: "matches" },
  { href: "/torneos", label: "Torneos", icon: "Medal", resource: "tournaments" },
  { href: "/pagos", label: "Pagos", icon: "Wallet", resource: "payments" },
  { href: "/comunicaciones", label: "Comunicaciones", icon: "Bell", resource: "communications" },
  { href: "/rendimiento", label: "Rendimiento", icon: "LineChart", resource: "evaluations" },
  { href: "/reportes", label: "Reportes", icon: "FileBarChart", resource: "reports" },
  { href: "/documentos", label: "Documentos", icon: "Folder", resource: "documents" },
  { href: "/configuracion", label: "Configuracion", icon: "Settings", resource: "settings" },
];
