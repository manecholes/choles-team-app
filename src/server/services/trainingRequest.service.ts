import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/auth";
import { formatDateCO } from "@/lib/date-format";
import type { z } from "zod";
import type { trainingRequestReviewSchema, trainingRequestSchema } from "@/server/validators/trainingRequest";

type TrainingRequestInput = z.infer<typeof trainingRequestSchema>;
type TrainingRequestReviewInput = z.infer<typeof trainingRequestReviewSchema>;

const PLAYER_SELECT = {
  select: { id: true, firstName: true, lastName: true, photoUrl: true },
} as const;

/** Entrenadores (usuarios con login) de los equipos activos del jugador. */
async function getCoachUserIdsForPlayer(playerId: number): Promise<number[]> {
  const teamPlayers = await prisma.teamPlayer.findMany({
    where: { playerId, leftAt: null },
    include: { team: { select: { coachId: true } } },
  });
  const coachIds = Array.from(
    new Set(teamPlayers.map((tp) => tp.team.coachId).filter((id): id is number => !!id))
  );
  if (coachIds.length === 0) return [];
  const users = await prisma.user.findMany({ where: { coachId: { in: coachIds } }, select: { id: true } });
  return users.map((u) => u.id);
}

/** Padres/tutores (con login) vinculados al jugador. */
async function getGuardianUserIdsForPlayer(playerId: number): Promise<number[]> {
  const links = await prisma.playerGuardian.findMany({
    where: { playerId },
    include: { guardian: { include: { user: { select: { id: true } } } } },
  });
  const ids = new Set<number>();
  for (const link of links) {
    if (link.guardian.user) ids.add(link.guardian.user.id);
  }
  return Array.from(ids);
}

async function getAdminUserIds(clubId: number): Promise<number[]> {
  const users = await prisma.user.findMany({ where: { clubId, role: "ADMIN" }, select: { id: true } });
  return users.map((u) => u.id);
}

async function notifyMany(
  clubId: number,
  userIds: number[],
  notification: { title: string; body: string; type: string; relatedUrl?: string }
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      clubId,
      userId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      relatedUrl: notification.relatedUrl ?? null,
    })),
  });
}

/** Crea la solicitud y notifica al/los entrenador(es) del jugador y a los administradores del club. */
export async function createTrainingRequest(clubId: number, playerId: number, data: TrainingRequestInput) {
  const player = await prisma.player.findFirstOrThrow({ where: { id: playerId, clubId }, select: { firstName: true, lastName: true } });

  const request = await prisma.trainingRequest.create({
    data: {
      clubId,
      playerId,
      requestedDate: data.requestedDate,
      startTime: data.startTime,
      endTime: data.endTime || null,
      location: data.location || null,
      notes: data.notes || null,
    },
  });

  const [coachUserIds, adminUserIds] = await Promise.all([
    getCoachUserIdsForPlayer(playerId),
    getAdminUserIds(clubId),
  ]);
  const recipientIds = Array.from(new Set([...coachUserIds, ...adminUserIds]));

  await notifyMany(clubId, recipientIds, {
    title: "Nueva solicitud de entrenamiento individual",
    body: `${player.firstName} ${player.lastName} solicito un entrenamiento individual para el ${formatDateCO(
      data.requestedDate
    )} a las ${data.startTime}.`,
    type: "TRAINING_REQUEST",
    relatedUrl: "/entrenamientos",
  });

  return request;
}

/** Solicitudes de un jugador (vista PLAYER: solo las suyas). */
export async function listTrainingRequestsForPlayer(clubId: number, playerId: number) {
  return prisma.trainingRequest.findMany({
    where: { clubId, playerId },
    include: { player: PLAYER_SELECT, reviewedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Solicitudes de varios jugadores (vista GUARDIAN: los hijos vinculados a su cuenta). */
export async function listTrainingRequestsForPlayers(clubId: number, playerIds: number[]) {
  if (playerIds.length === 0) return [];
  return prisma.trainingRequest.findMany({
    where: { clubId, playerId: { in: playerIds } },
    include: { player: PLAYER_SELECT, reviewedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Solicitudes de los jugadores de los equipos de un entrenador (vista COACH: solo lo suyo). */
export async function listTrainingRequestsForTeams(clubId: number, teamIds: number[]) {
  if (teamIds.length === 0) return [];
  return prisma.trainingRequest.findMany({
    where: {
      clubId,
      player: { teamPlayers: { some: { teamId: { in: teamIds }, leftAt: null } } },
    },
    include: { player: PLAYER_SELECT, reviewedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Todas las solicitudes del club (vista ADMIN/SUPER_ADMIN). */
export async function listTrainingRequestsForClub(clubId: number) {
  return prisma.trainingRequest.findMany({
    where: { clubId },
    include: { player: PLAYER_SELECT, reviewedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Aprueba o rechaza una solicitud. Solo se puede revisar una solicitud que
 * este PENDING (evita que dos revisores la resuelvan dos veces a la vez con
 * resultados distintos). Notifica al jugador y a sus padres/tutores (los que
 * tengan login) del resultado.
 */
export async function reviewTrainingRequest(
  clubId: number,
  id: number,
  reviewerUserId: number,
  data: TrainingRequestReviewInput
) {
  const existing = await prisma.trainingRequest.findFirstOrThrow({ where: { id, clubId } });
  if (existing.status !== "PENDING") {
    throw new ForbiddenError("Esta solicitud ya fue revisada");
  }

  const request = await prisma.trainingRequest.update({
    where: { id },
    data: {
      status: data.status,
      reviewNote: data.reviewNote || null,
      reviewedById: reviewerUserId,
      reviewedAt: new Date(),
    },
    include: { player: PLAYER_SELECT },
  });

  const [playerUser, guardianUserIds] = await Promise.all([
    prisma.user.findFirst({ where: { playerId: request.playerId }, select: { id: true } }),
    getGuardianUserIdsForPlayer(request.playerId),
  ]);
  const recipientIds = Array.from(new Set([...(playerUser ? [playerUser.id] : []), ...guardianUserIds]));

  const approved = data.status === "APPROVED";
  await notifyMany(clubId, recipientIds, {
    title: approved ? "Entrenamiento individual aprobado" : "Entrenamiento individual rechazado",
    body: `La solicitud de ${request.player.firstName} ${request.player.lastName} para el ${formatDateCO(
      request.requestedDate
    )} a las ${request.startTime} fue ${approved ? "aprobada" : "rechazada"}.`,
    type: "TRAINING_REQUEST_REVIEWED",
    relatedUrl: "/mi-hijo",
  });

  return request;
}
