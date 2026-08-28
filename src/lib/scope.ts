import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type AccessTokenPayload } from "@/lib/auth";

/**
 * Resuelve la identidad funcional vinculada al usuario logueado
 * (coachId/delegateId/guardianId/playerId), usada para aplicar los
 * permisos "_own" de COACH/DELEGATE/GUARDIAN/PLAYER (punto 3): estos
 * roles tienen acceso de lectura/escritura solo a SU equipo, SUS
 * jugadores o SUS hijos, nunca a todo el club.
 */
export async function getActingIdentity(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { coachId: true, delegateId: true, guardianId: true, playerId: true },
  });
  return user;
}

/**
 * Verifica que un COACH sea efectivamente el entrenador del equipo
 * indicado antes de permitirle crear/editar entrenamientos, asistencia,
 * partidos o evaluaciones de ese equipo. Los roles con permiso global
 * (SUPER_ADMIN/ADMIN) pasan sin restriccion.
 */
export async function assertCoachOwnsTeam(user: AccessTokenPayload & { userId: number }, teamId: number) {
  if (user.role !== "COACH") return; // solo aplica la restriccion a COACH
  const identity = await getActingIdentity(user.userId);
  if (!identity.coachId) {
    throw new ForbiddenError("Tu usuario no tiene un entrenador vinculado");
  }
  const team = await prisma.team.findFirst({ where: { id: teamId, clubId: user.clubId ?? undefined } });
  if (!team || team.coachId !== identity.coachId) {
    throw new ForbiddenError("Solo puedes gestionar tus propios equipos");
  }
}

export async function assertCoachOwnsPlayer(user: AccessTokenPayload & { userId: number }, playerId: number) {
  if (user.role !== "COACH") return;
  const identity = await getActingIdentity(user.userId);
  if (!identity.coachId) throw new ForbiddenError("Tu usuario no tiene un entrenador vinculado");
  const owns = await prisma.teamPlayer.findFirst({
    where: { playerId, leftAt: null, team: { coachId: identity.coachId } },
  });
  if (!owns) throw new ForbiddenError("Solo puedes gestionar jugadores de tus propios equipos");
}

/** Para COACH: ids de los equipos que entrena (usado para acotar listados "_own"). */
export async function getCoachTeamIds(userId: number): Promise<number[]> {
  const identity = await getActingIdentity(userId);
  if (!identity.coachId) return [];
  const teams = await prisma.team.findMany({ where: { coachId: identity.coachId }, select: { id: true } });
  return teams.map((t) => t.id);
}

/** Para DELEGATE: ids de los equipos que tiene asignados. */
export async function getDelegateTeamIds(userId: number): Promise<number[]> {
  const identity = await getActingIdentity(userId);
  if (!identity.delegateId) return [];
  const teams = await prisma.team.findMany({ where: { delegateId: identity.delegateId }, select: { id: true } });
  return teams.map((t) => t.id);
}

/** Para GUARDIAN: ids de los jugadores (hijos) vinculados a su usuario. */
export async function getGuardianChildrenIds(userId: number): Promise<number[]> {
  const identity = await getActingIdentity(userId);
  if (!identity.guardianId) return [];
  const links = await prisma.playerGuardian.findMany({
    where: { guardianId: identity.guardianId },
    select: { playerId: true },
  });
  return links.map((l) => l.playerId);
}

export async function assertGuardianOwnsPlayer(user: AccessTokenPayload & { userId: number }, playerId: number) {
  if (user.role !== "GUARDIAN") return;
  const ids = await getGuardianChildrenIds(user.userId);
  if (!ids.includes(playerId)) {
    throw new ForbiddenError("Solo puedes consultar la informacion de tus hijos");
  }
}
