import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { communicationSchema } from "@/server/validators/communication";

type CommunicationInput = z.infer<typeof communicationSchema>;

/** Resuelve los IDs de usuario (destinatarios) segun el tipo de audiencia (punto 14 del maestro). */
async function resolveRecipientUserIds(
  clubId: number,
  audienceType: CommunicationInput["audienceType"],
  categoryId?: number | null,
  teamId?: number | null
): Promise<number[]> {
  if (audienceType === "ALL") {
    const users = await prisma.user.findMany({ where: { clubId }, select: { id: true } });
    return users.map((u) => u.id);
  }

  if (audienceType === "GUARDIANS" || audienceType === "PLAYERS" || audienceType === "COACHES") {
    const roleMap = { GUARDIANS: "GUARDIAN", PLAYERS: "PLAYER", COACHES: "COACH" } as const;
    const users = await prisma.user.findMany({
      where: { clubId, role: roleMap[audienceType] },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  // CATEGORY o TEAM: se notifica a los jugadores (con cuenta) y a sus padres/tutores.
  const playerWhere: any = { clubId };
  if (audienceType === "CATEGORY") playerWhere.categoryId = categoryId;
  if (audienceType === "TEAM") playerWhere.teamPlayers = { some: { teamId, leftAt: null } };

  const players = await prisma.player.findMany({
    where: playerWhere,
    select: {
      user: { select: { id: true } },
      guardians: { select: { guardian: { select: { user: { select: { id: true } } } } } },
    },
  });

  const ids = new Set<number>();
  for (const p of players) {
    if (p.user) ids.add(p.user.id);
    for (const g of p.guardians) {
      if (g.guardian.user) ids.add(g.guardian.user.id);
    }
  }
  return Array.from(ids);
}

export async function listMessages(clubId: number) {
  const messages = await prisma.message.findMany({
    where: { clubId },
    include: {
      createdBy: { select: { email: true } },
      category: { select: { name: true } },
      team: { select: { name: true } },
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const readCounts = await prisma.messageRecipient.groupBy({
    by: ["messageId"],
    where: { messageId: { in: messages.map((m) => m.id) }, readAt: { not: null } },
    _count: { _all: true },
  });
  const readMap = new Map(readCounts.map((r) => [r.messageId, r._count._all]));

  return messages.map((m) => ({
    ...m,
    recipientCount: m._count.recipients,
    readCount: readMap.get(m.id) ?? 0,
  }));
}

export async function createMessage(clubId: number, createdById: number, data: CommunicationInput) {
  const recipientIds = await resolveRecipientUserIds(clubId, data.audienceType, data.categoryId, data.teamId);

  const message = await prisma.message.create({
    data: {
      clubId,
      title: data.title,
      body: data.body,
      audienceType: data.audienceType,
      categoryId: data.categoryId || null,
      teamId: data.teamId || null,
      createdById,
    },
  });

  if (recipientIds.length > 0) {
    await prisma.messageRecipient.createMany({
      data: recipientIds.map((userId) => ({ messageId: message.id, userId })),
      skipDuplicates: true,
    });
    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        clubId,
        userId,
        title: "Nuevo comunicado",
        body: message.title,
        type: "MESSAGE",
        relatedUrl: "/comunicaciones",
      })),
    });
  }

  return { message, recipientCount: recipientIds.length };
}

export async function getMessageDetail(clubId: number, id: number) {
  const message = await prisma.message.findFirstOrThrow({
    where: { id, clubId },
    include: {
      createdBy: { select: { email: true } },
      category: { select: { name: true } },
      team: { select: { name: true } },
      recipients: { include: { user: { select: { id: true, email: true, role: true } } } },
    },
  });
  return message;
}

export async function listInboxMessages(userId: number) {
  const recipients = await prisma.messageRecipient.findMany({
    where: { userId },
    include: { message: true },
    orderBy: { message: { createdAt: "desc" } },
  });
  return recipients.map((r) => ({
    recipientId: r.id,
    readAt: r.readAt,
    message: r.message,
  }));
}

export async function markMessageRead(userId: number, messageId: number) {
  await prisma.messageRecipient.updateMany({
    where: { userId, messageId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function listNotifications(userId: number) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(userId: number, id: number) {
  await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: number) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
