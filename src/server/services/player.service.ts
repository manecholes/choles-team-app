import "server-only";
import { prisma } from "@/lib/prisma";
import type { PlayerInput, playerGuardianSchema } from "@/server/validators/player";
import type { z } from "zod";
import { attendancePercentage, type AttendanceStatus as AttStatus } from "@/server/logic/attendance";

export async function listPlayers(
  clubId: number,
  filters: { search?: string; categoryId?: number; teamId?: number; status?: string } = {}
) {
  const where: any = { clubId };
  if (filters.status) where.status = filters.status;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
      { documentId: { contains: filters.search } },
    ];
  }
  if (filters.teamId) {
    where.teamPlayers = { some: { teamId: filters.teamId, leftAt: null } };
  }

  return prisma.player.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      teamPlayers: {
        where: { leftAt: null },
        include: { team: { select: { id: true, name: true } } },
        take: 1,
        orderBy: { joinedAt: "desc" },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function createPlayer(clubId: number, data: PlayerInput) {
  return prisma.player.create({
    data: {
      clubId,
      firstName: data.firstName,
      lastName: data.lastName,
      documentId: data.documentId || null,
      birthDate: data.birthDate,
      sex: data.sex,
      photoUrl: data.photoUrl || null,
      phone: data.phone || null,
      address: data.address || null,
      eps: data.eps || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      categoryId: data.categoryId || null,
      position: data.position || null,
      heightCm: data.heightCm || null,
      weightKg: data.weightKg || null,
      status: data.status,
      joinDate: data.joinDate ?? new Date(),
      observations: data.observations || null,
    },
  });
}

export async function updatePlayer(clubId: number, playerId: number, data: PlayerInput) {
  await prisma.player.findFirstOrThrow({ where: { id: playerId, clubId } });
  return prisma.player.update({
    where: { id: playerId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      documentId: data.documentId || null,
      birthDate: data.birthDate,
      sex: data.sex,
      photoUrl: data.photoUrl || null,
      phone: data.phone || null,
      address: data.address || null,
      eps: data.eps || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      categoryId: data.categoryId || null,
      position: data.position || null,
      heightCm: data.heightCm || null,
      weightKg: data.weightKg || null,
      status: data.status,
      observations: data.observations || null,
    },
  });
}

export async function deletePlayer(clubId: number, playerId: number) {
  await prisma.player.findFirstOrThrow({ where: { id: playerId, clubId } });
  // Cascade definido en el esquema elimina asistencia, pagos, estadisticas,
  // evaluaciones, documentos y vinculos de equipo asociados a este jugador.
  await prisma.player.delete({ where: { id: playerId } });
}

function calculateAge(birthDate: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - birthDate.getFullYear();
  const m = at.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birthDate.getDate())) age--;
  return age;
}

/**
 * Trae todos los datos necesarios para las 10 pestanas del perfil del
 * jugador (punto 5) en una sola pasada, ya que el volumen por jugador es
 * pequeno y evita ida-y-vuelta adicionales desde el cliente.
 */
export async function getPlayerProfile(clubId: number, playerId: number) {
  const player = await prisma.player.findFirstOrThrow({
    where: { id: playerId, clubId },
    include: {
      category: true,
      guardians: { include: { guardian: true } },
      teamPlayers: { include: { team: true, season: true }, orderBy: { joinedAt: "desc" } },
    },
  });

  const [attendance, payments, matchStats, evaluations, documents, loadEntries] = await Promise.all([
    prisma.attendance.findMany({
      where: { playerId },
      include: { trainingSession: { select: { date: true, team: { select: { name: true } } } } },
      orderBy: { trainingSession: { date: "desc" } },
      take: 60,
    }),
    prisma.payment.findMany({
      where: { playerId },
      include: { concept: true, receipt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.matchStatistic.findMany({
      where: { playerId },
      include: { match: { select: { date: true, opponentName: true, resultTeamScore: true, resultOpponentScore: true } } },
      orderBy: { match: { date: "desc" } },
    }),
    prisma.evaluation.findMany({
      where: { playerId },
      include: { tests: true },
      orderBy: { date: "desc" },
    }),
    prisma.document.findMany({ where: { playerId }, orderBy: { uploadedAt: "desc" } }),
    prisma.loadEntry.findMany({ where: { playerId }, orderBy: { date: "desc" }, take: 60 }),
  ]);

  const overallAttendance = attendancePercentage(attendance.map((a) => a.status as AttStatus));
  const currentTeam = player.teamPlayers.find((tp) => !tp.leftAt)?.team ?? null;

  const upcomingTrainings = currentTeam
    ? await prisma.trainingSession.findMany({
        where: { teamId: currentTeam.id, date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 10,
      })
    : [];

  return {
    player,
    age: calculateAge(player.birthDate),
    attendance,
    attendancePercentage: overallAttendance,
    payments,
    matchStats,
    evaluations,
    documents,
    loadEntries,
    currentTeam,
    upcomingTrainings,
  };
}

type GuardianInput = z.infer<typeof playerGuardianSchema>;

export async function addOrLinkGuardian(clubId: number, playerId: number, data: GuardianInput) {
  await prisma.player.findFirstOrThrow({ where: { id: playerId, clubId } });

  let guardianId = data.guardianId;
  if (!guardianId) {
    if (!data.firstName || !data.lastName) {
      throw new Error("Nombre y apellido del tutor son requeridos para crear uno nuevo");
    }
    const guardian = await prisma.guardian.create({
      data: {
        clubId,
        firstName: data.firstName,
        lastName: data.lastName,
        documentId: data.documentId || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      },
    });
    guardianId = guardian.id;
  }

  return prisma.playerGuardian.upsert({
    where: { playerId_guardianId: { playerId, guardianId } },
    update: {
      relationship: data.relationship,
      isPrimaryContact: data.isPrimaryContact,
      canViewPayments: data.canViewPayments,
      canViewEvaluations: data.canViewEvaluations,
    },
    create: {
      playerId,
      guardianId,
      relationship: data.relationship,
      isPrimaryContact: data.isPrimaryContact,
      canViewPayments: data.canViewPayments,
      canViewEvaluations: data.canViewEvaluations,
    },
    include: { guardian: true },
  });
}

export async function removeGuardianLink(clubId: number, playerId: number, guardianId: number) {
  await prisma.player.findFirstOrThrow({ where: { id: playerId, clubId } });
  await prisma.playerGuardian.delete({ where: { playerId_guardianId: { playerId, guardianId } } });
}
