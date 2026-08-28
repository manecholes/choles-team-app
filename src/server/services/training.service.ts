import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { attendanceBatchSchema, trainingSessionSchema } from "@/server/validators/training";
import { attendancePercentage, type AttendanceStatus as AttStatus } from "@/server/logic/attendance";
import { computeInternalLoad } from "@/server/logic/load";

type TrainingInput = z.infer<typeof trainingSessionSchema>;
type AttendanceBatchInput = z.infer<typeof attendanceBatchSchema>;

export async function listTrainingSessions(
  clubId: number,
  filters: { teamId?: number; teamIds?: number[]; from?: Date; to?: Date } = {}
) {
  const where: any = { clubId };
  if (filters.teamId) where.teamId = filters.teamId;
  if (filters.teamIds) where.teamId = { in: filters.teamIds };
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }
  return prisma.trainingSession.findMany({
    where,
    include: { team: { select: { id: true, name: true } }, _count: { select: { attendance: true } } },
    orderBy: { date: "desc" },
  });
}

export async function createTrainingSession(clubId: number, createdById: number, data: TrainingInput) {
  const team = await prisma.team.findFirstOrThrow({ where: { id: data.teamId, clubId } });

  const session = await prisma.trainingSession.create({
    data: {
      clubId,
      teamId: data.teamId,
      coachId: team.coachId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location || null,
      objective: data.objective || null,
      content: data.content || null,
      durationMinutes: data.durationMinutes,
      observations: data.observations || null,
    },
  });

  const [startH, startM] = data.startTime.split(":").map(Number);
  const [endH, endM] = data.endTime.split(":").map(Number);
  const startAt = new Date(data.date);
  startAt.setHours(startH || 0, startM || 0, 0, 0);
  const endAt = new Date(data.date);
  endAt.setHours(endH || 0, endM || 0, 0, 0);

  await prisma.calendarEvent.create({
    data: {
      clubId,
      title: `Entrenamiento ${team.name}`,
      type: "TRAINING",
      startAt,
      endAt,
      location: data.location || null,
      teamId: team.id,
      categoryId: team.categoryId,
      createdById,
      trainingSessionId: session.id,
    },
  });

  return session;
}

export async function updateTrainingSession(clubId: number, id: number, data: TrainingInput) {
  await prisma.trainingSession.findFirstOrThrow({ where: { id, clubId } });
  return prisma.trainingSession.update({
    where: { id },
    data: {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location || null,
      objective: data.objective || null,
      content: data.content || null,
      durationMinutes: data.durationMinutes,
      observations: data.observations || null,
    },
  });
}

export async function deleteTrainingSession(clubId: number, id: number) {
  await prisma.trainingSession.findFirstOrThrow({ where: { id, clubId } });
  await prisma.calendarEvent.deleteMany({ where: { trainingSessionId: id } });
  await prisma.trainingSession.delete({ where: { id } });
}

/** Trae la sesion con la plantilla del equipo y la asistencia ya registrada (si la hay). */
export async function getTrainingSessionForAttendance(clubId: number, id: number) {
  const session = await prisma.trainingSession.findFirstOrThrow({
    where: { id, clubId },
    include: {
      team: { select: { id: true, name: true } },
      attendance: true,
    },
  });

  const roster = await prisma.teamPlayer.findMany({
    where: { teamId: session.teamId, leftAt: null },
    include: { player: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    orderBy: { jerseyNumber: "asc" },
  });

  const attendanceByPlayer = new Map(session.attendance.map((a) => [a.playerId, a]));

  return {
    session,
    roster: roster.map((tp) => ({
      player: tp.player,
      jerseyNumber: tp.jerseyNumber,
      attendance: attendanceByPlayer.get(tp.player.id) ?? null,
    })),
  };
}

/**
 * Guarda (o actualiza) la asistencia de toda la sesion en una sola llamada
 * -- pensado para que el entrenador pueda pasarla desde el celular en
 * pocos segundos (punto 29). Tambien registra la carga interna (RPE x
 * duracion) cuando el entrenador la reporta para jugadores presentes.
 */
export async function saveAttendanceBatch(clubId: number, sessionId: number, data: AttendanceBatchInput) {
  const session = await prisma.trainingSession.findFirstOrThrow({ where: { id: sessionId, clubId } });

  await prisma.$transaction(
    data.records.map((r) =>
      prisma.attendance.upsert({
        where: { trainingSessionId_playerId: { trainingSessionId: sessionId, playerId: r.playerId } },
        update: { status: r.status, note: r.note || null },
        create: { trainingSessionId: sessionId, playerId: r.playerId, status: r.status, note: r.note || null },
      })
    )
  );

  for (const r of data.records) {
    if (r.rpe && (r.status === "PRESENT" || r.status === "LATE")) {
      const internalLoad = computeInternalLoad(r.rpe, session.durationMinutes);
      const existing = await prisma.loadEntry.findFirst({ where: { trainingSessionId: sessionId, playerId: r.playerId } });
      if (existing) {
        await prisma.loadEntry.update({ where: { id: existing.id }, data: { rpe: r.rpe, internalLoad } });
      } else {
        await prisma.loadEntry.create({
          data: {
            clubId,
            playerId: r.playerId,
            trainingSessionId: sessionId,
            date: session.date,
            rpe: r.rpe,
            durationMinutes: session.durationMinutes,
            internalLoad,
          },
        });
      }
    }
  }

  return getTrainingSessionForAttendance(clubId, sessionId);
}

/** % de asistencia del equipo en los ultimos `days` dias. */
export async function getTeamAttendancePercentage(clubId: number, teamId: number, days = 30): Promise<number | null> {
  const records = await prisma.attendance.findMany({
    where: { trainingSession: { clubId, teamId, date: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } },
    select: { status: true },
  });
  return attendancePercentage(records.map((r) => r.status as AttStatus));
}
