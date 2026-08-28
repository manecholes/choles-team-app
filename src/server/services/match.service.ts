import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { matchSchema, matchStatisticsBatchSchema } from "@/server/validators/match";

type MatchInput = z.infer<typeof matchSchema>;
type StatsBatchInput = z.infer<typeof matchStatisticsBatchSchema>;

export async function listMatches(clubId: number, filters: { teamId?: number; teamIds?: number[]; status?: string } = {}) {
  const where: any = { clubId };
  if (filters.teamId) where.teamId = filters.teamId;
  if (filters.teamIds) where.teamId = { in: filters.teamIds };
  if (filters.status) where.status = filters.status;

  return prisma.match.findMany({
    where,
    include: { team: { select: { id: true, name: true } }, tournament: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });
}

export async function createMatch(clubId: number, createdById: number, data: MatchInput) {
  const match = await prisma.match.create({
    data: {
      clubId,
      competition: data.competition || null,
      tournamentId: data.tournamentId || null,
      categoryId: data.categoryId || null,
      teamId: data.teamId,
      opponentName: data.opponentName,
      date: data.date,
      time: data.time,
      venue: data.venue || null,
      isHome: data.isHome,
      status: data.status,
      resultTeamScore: data.resultTeamScore ?? null,
      resultOpponentScore: data.resultOpponentScore ?? null,
    },
    include: { team: true },
  });

  const [h, m] = data.time.split(":").map(Number);
  const startAt = new Date(data.date);
  startAt.setHours(h || 0, m || 0, 0, 0);
  const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

  await prisma.calendarEvent.create({
    data: {
      clubId,
      title: `${match.team.name} vs ${data.opponentName}`,
      type: "MATCH",
      startAt,
      endAt,
      location: data.venue || null,
      teamId: data.teamId,
      categoryId: data.categoryId || match.team.categoryId,
      createdById,
      matchId: match.id,
    },
  });

  return match;
}

export async function updateMatch(clubId: number, id: number, data: MatchInput) {
  await prisma.match.findFirstOrThrow({ where: { id, clubId } });
  return prisma.match.update({
    where: { id },
    data: {
      competition: data.competition || null,
      tournamentId: data.tournamentId || null,
      categoryId: data.categoryId || null,
      opponentName: data.opponentName,
      date: data.date,
      time: data.time,
      venue: data.venue || null,
      isHome: data.isHome,
      status: data.status,
      resultTeamScore: data.resultTeamScore ?? null,
      resultOpponentScore: data.resultOpponentScore ?? null,
    },
  });
}

export async function deleteMatch(clubId: number, id: number) {
  await prisma.match.findFirstOrThrow({ where: { id, clubId } });
  await prisma.calendarEvent.deleteMany({ where: { matchId: id } });
  await prisma.match.delete({ where: { id } });
}

export async function getMatchForStats(clubId: number, id: number) {
  const match = await prisma.match.findFirstOrThrow({
    where: { id, clubId },
    include: { team: { select: { id: true, name: true } }, statistics: true },
  });
  const roster = await prisma.teamPlayer.findMany({
    where: { teamId: match.teamId, leftAt: null },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { jerseyNumber: "asc" },
  });
  const statsByPlayer = new Map(match.statistics.map((s) => [s.playerId, s]));

  return {
    match,
    roster: roster.map((tp) => ({
      player: tp.player,
      jerseyNumber: tp.jerseyNumber,
      stats: statsByPlayer.get(tp.player.id) ?? null,
    })),
  };
}

export async function saveMatchStatistics(clubId: number, matchId: number, data: StatsBatchInput) {
  await prisma.match.findFirstOrThrow({ where: { id: matchId, clubId } });

  await prisma.$transaction(
    data.stats.map((s) =>
      prisma.matchStatistic.upsert({
        where: { matchId_playerId: { matchId, playerId: s.playerId } },
        update: s,
        create: { matchId, ...s },
      })
    )
  );

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "FINISHED",
      resultTeamScore: data.resultTeamScore,
      resultOpponentScore: data.resultOpponentScore,
    },
  });

  return getMatchForStats(clubId, matchId);
}
