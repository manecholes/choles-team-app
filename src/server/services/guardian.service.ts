import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword, ForbiddenError } from "@/lib/auth";
import { attendancePercentage, type AttendanceStatus as AttStatus } from "@/server/logic/attendance";
import { effectiveStatus, daysOverdue } from "@/server/logic/cartera";

/**
 * Crea el acceso (usuario/contrasena) para un padre/tutor ya registrado
 * (vinculado a uno o mas jugadores desde la pestana "Familia"). Igual que
 * con entrenadores/delegados, registrar el contacto y darle acceso a la
 * app son pasos separados a proposito.
 */
export async function createGuardianUserAccess(clubId: number, guardianId: number, email: string, password: string) {
  const guardian = await prisma.guardian.findFirstOrThrow({
    where: { id: guardianId, clubId },
    include: { user: true },
  });
  if (guardian.user) {
    throw new ForbiddenError("Este padre/tutor ya tiene un acceso creado");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { clubId, email, passwordHash, role: "GUARDIAN", guardianId, mustChangePassword: true },
    select: { id: true, email: true, role: true },
  });
}

/** Restablece la contrasena de un padre/tutor que YA tiene acceso creado. */
export async function resetGuardianPassword(clubId: number, guardianId: number, password: string) {
  const guardian = await prisma.guardian.findFirstOrThrow({
    where: { id: guardianId, clubId },
    include: { user: true },
  });
  if (!guardian.user) {
    throw new ForbiddenError("Este padre/tutor todavia no tiene un acceso creado");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.update({
    where: { id: guardian.user.id },
    data: { passwordHash, mustChangePassword: true },
    select: { id: true, email: true, role: true },
  });
}

/** Resumen simplificado de un jugador para la vista "Mi Hijo" del padre/tutor (punto 29). */
export async function getChildSummary(clubId: number, playerId: number) {
  const now = new Date();

  const player = await prisma.player.findFirstOrThrow({
    where: { id: playerId, clubId },
    include: {
      category: { select: { name: true } },
      teamPlayers: { where: { leftAt: null }, take: 1, include: { team: { select: { id: true, name: true } } } },
    },
  });
  const team = player.teamPlayers[0]?.team ?? null;

  const [nextTraining, nextMatch, payments, recentAttendance] = await Promise.all([
    team
      ? prisma.trainingSession.findFirst({
          where: { clubId, teamId: team.id, date: { gte: now } },
          orderBy: { date: "asc" },
        })
      : null,
    team
      ? prisma.match.findFirst({
          where: { clubId, teamId: team.id, date: { gte: now }, status: "SCHEDULED" },
          orderBy: { date: "asc" },
        })
      : null,
    prisma.payment.findMany({
      where: { clubId, playerId, status: { in: ["PENDING", "OVERDUE"] } },
      include: { concept: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.attendance.findMany({
      where: { playerId },
      select: { status: true },
      orderBy: { trainingSession: { date: "desc" } },
      take: 20,
    }),
  ]);

  const pendingPayments = payments
    .map((p) => ({
      ...p,
      effective: effectiveStatus({
        status: p.status,
        dueDate: p.dueDate?.toISOString() ?? null,
        paymentDate: null,
        amount: p.amount,
      }),
      daysOverdue: daysOverdue(p.dueDate?.toISOString() ?? null),
    }))
    .filter((p) => p.effective !== "PAID");

  const totalDebt = pendingPayments.reduce((acc, p) => acc + p.amount, 0);
  const overdueCount = pendingPayments.filter((p) => p.effective === "OVERDUE").length;

  return {
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      category: player.category?.name ?? null,
      team: team?.name ?? null,
      status: player.status,
    },
    nextTraining: nextTraining ? { id: nextTraining.id, date: nextTraining.date, startTime: nextTraining.startTime, location: nextTraining.location } : null,
    nextMatch: nextMatch ? { id: nextMatch.id, date: nextMatch.date, opponentName: nextMatch.opponentName, isHome: nextMatch.isHome } : null,
    attendancePercentage: attendancePercentage(recentAttendance.map((a) => a.status as AttStatus)),
    payments: {
      totalDebt,
      overdueCount,
      pendingCount: pendingPayments.length - overdueCount,
      items: pendingPayments.slice(0, 5).map((p) => ({
        id: p.id,
        concept: p.concept.name,
        amount: p.amount,
        dueDate: p.dueDate,
        status: p.effective,
        daysOverdue: p.daysOverdue,
      })),
    },
  };
}
