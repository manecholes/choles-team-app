import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { teamSchema } from "@/server/validators/team";

type TeamInput = z.infer<typeof teamSchema>;

export async function listTeams(clubId: number, filters: { categoryId?: number; coachId?: number } = {}) {
  const where: any = { clubId };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.coachId) where.coachId = filters.coachId;

  return prisma.team.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      coach: { select: { id: true, firstName: true, lastName: true } },
      delegate: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { teamPlayers: { where: { leftAt: null } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createTeam(clubId: number, data: TeamInput) {
  return prisma.team.create({
    data: {
      clubId,
      name: data.name,
      categoryId: data.categoryId,
      branch: data.branch,
      coachId: data.coachId || null,
      delegateId: data.delegateId || null,
      logoUrl: data.logoUrl || null,
      seasonId: data.seasonId || null,
      status: data.status,
    },
  });
}

export async function updateTeam(clubId: number, id: number, data: TeamInput) {
  await prisma.team.findFirstOrThrow({ where: { id, clubId } });
  return prisma.team.update({
    where: { id },
    data: {
      name: data.name,
      categoryId: data.categoryId,
      branch: data.branch,
      coachId: data.coachId || null,
      delegateId: data.delegateId || null,
      logoUrl: data.logoUrl || null,
      seasonId: data.seasonId || null,
      status: data.status,
    },
  });
}

export async function deleteTeam(clubId: number, id: number) {
  await prisma.team.findFirstOrThrow({ where: { id, clubId } });
  await prisma.team.delete({ where: { id } });
}

/** Datos para la pagina interna del equipo (punto 7): plantilla, proximos partidos, resultados, entrenamientos, asistencia. */
export async function getTeamDetail(clubId: number, teamId: number) {
  const team = await prisma.team.findFirstOrThrow({
    where: { id: teamId, clubId },
    include: {
      category: true,
      coach: true,
      delegate: true,
      season: true,
    },
  });

  const now = new Date();
  const [roster, upcomingMatches, pastMatches, upcomingTrainings, recentAttendance] = await Promise.all([
    prisma.teamPlayer.findMany({
      where: { teamId, leftAt: null },
      include: { player: true },
      orderBy: { jerseyNumber: "asc" },
    }),
    prisma.match.findMany({
      where: { teamId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.match.findMany({
      where: { teamId, status: "FINISHED" },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.trainingSession.findMany({
      where: { teamId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.attendance.findMany({
      where: {
        trainingSession: {
          teamId,
          date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      select: { status: true },
    }),
  ]);

  return { team, roster, upcomingMatches, pastMatches, upcomingTrainings, recentAttendance };
}
