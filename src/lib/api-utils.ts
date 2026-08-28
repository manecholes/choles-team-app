import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ForbiddenError,
  UnauthorizedError,
  type AccessTokenPayload,
} from "@/lib/auth";
import { can } from "@/lib/permissions";

/**
 * Envuelve un Route Handler para centralizar el manejo de errores:
 * - UnauthorizedError -> 401
 * - ForbiddenError -> 403
 * - ZodError -> 400 con detalle de validacion
 * - Prisma "Record not found" (P2025) -> 404
 * - Cualquier otro error -> 500 (sin filtrar detalles internos al cliente)
 */
export function withErrorHandling(
  handler: (req: Request, ctx: any) => Promise<NextResponse>
) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message || "No autorizado" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message || "Sin permisos" }, { status: 403 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Datos invalidos", details: err.flatten() },
      { status: 400 }
    );
  }
  const prismaErr = err as { code?: string; message?: string };
  if (prismaErr?.code === "P2025") {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }
  if (prismaErr?.code === "P2002") {
    return NextResponse.json(
      { error: "Ya existe un registro con ese valor unico" },
      { status: 409 }
    );
  }
  // eslint-disable-next-line no-console
  console.error("[API_ERROR]", err);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

/** Exige que el usuario tenga el permiso indicado; lanza ForbiddenError si no. */
export function assertPermission(user: AccessTokenPayload, permission: string) {
  if (!can(user.role, permission)) {
    throw new ForbiddenError(`No tienes permiso para: ${permission}`);
  }
}

/**
 * Igual que assertPermission pero acepta varias alternativas validas.
 * Se usa para acciones donde un ADMIN tiene el permiso "global" (p. ej.
 * "trainings:write") y un COACH/DELEGATE tiene la variante acotada a lo
 * suyo (p. ej. "trainings:write_own"). El servicio que se llama despues
 * es responsable de aplicar el filtro de "lo suyo" cuando corresponda
 * (ver src/lib/scope.ts).
 */
export function assertAnyPermission(user: AccessTokenPayload, permissions: string[]) {
  if (!permissions.some((p) => can(user.role, p))) {
    throw new ForbiddenError(`No tienes permiso para: ${permissions.join(" o ")}`);
  }
}

/** Aplica el filtro multi-club: SUPER_ADMIN puede pasar clubId por query, el resto queda fijo a su club. */
export function resolveClubScope(
  user: AccessTokenPayload,
  requestedClubId?: number | null
): number | null {
  if (user.role === "SUPER_ADMIN") {
    return requestedClubId ?? null; // null = sin filtro (todas las plataformas), solo para vistas globales
  }
  if (!user.clubId) {
    throw new ForbiddenError("El usuario no tiene un club asignado");
  }
  return user.clubId;
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
