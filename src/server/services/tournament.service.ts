import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { generateFixtureSchema, tournamentSchema } from "@/server/validators/tournament";
import { computeStandings, generateRoundRobin, splitIntoGroups } from "@/server/logic/fixtures";

type TournamentInput = z.infer<typeof tournamentSchema>;
type FixtureInput = z.infer<typeof generateFixtureSchema>;

export async function listTournaments(clubId: number) {
  return prisma.tournament.findMany({
    where: { clubId },
    include: { category: { select: { id: true, name: true } }, _count: { select: { teams: true, matches: true } } },
    orderBy: { startDate: "desc" },
  });
}

export async function createTournament(clubId: number, data: TournamentInput) {
  return prisma.tournament.create({
    data: {
      clubId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      categoryId: data.categoryId || null,
      description: data.description || null,
      status: data.status,
    },
  });
}

export async function deleteTournament(clubId: number, id: number) {
  await prisma.tournament.findFirstOrThrow({ where: { id, clubId } });
  await prisma.match.deleteMany({ where: { tournamentId: id } });
  await prisma.tournamentTeam.deleteMany({ where: { tournamentId: id } });
  await prisma.tournamentGroup.deleteMany({ where: { tournamentId: id } });
  await prisma.tournament.delete({ where: { id } });
}

/** Etiqueta legible de un participante ya sea equipo propio o rival externo. */
function participantLabel(p: { team: { name: string } | null; externalTeamName: string | null }) {
  return p.team?.name ?? p.externalTeamName ?? "Rival";
}

/**
 * Genera (o regenera) el fixture de un torneo: reparte los participantes en
 * grupos, calcula el todos-contra-todos de cada grupo (src/server/logic/fixtures.ts,
 * ya cubierto por pruebas unitarias) y crea los partidos. Es idempotente:
 * si ya existia un fixture generado, se reemplaza por completo.
 */
export async function generateFixture(clubId: number, tournamentId: number, createdById: number, data: FixtureInput) {
  const tournament = await prisma.tournament.findFirstOrThrow({ where: { id: tournamentId, clubId } });

  // Validar que los equipos internos referenciados pertenezcan al club
  const internalIds = data.participants.map((p) => p.teamId).filter((x): x is number => !!x);
  if (internalIds.length > 0) {
    const count = await prisma.team.count({ where: { id: { in: internalIds }, clubId } });
    if (count !== new Set(internalIds).size) {
      throw new Error("Alguno de los equipos seleccionados no pertenece a este club");
    }
  }

  return prisma.$transaction(async (tx) => {
    // Limpiar fixture previo para permitir regenerar sin duplicar
    await tx.match.deleteMany({ where: { tournamentId } });
    await tx.tournamentTeam.deleteMany({ where: { tournamentId } });
    await tx.tournamentGroup.deleteMany({ where: { tournamentId } });

    const groupsOfParticipants = splitIntoGroups(data.participants, data.groupCount);
    const createdMatches: number[] = [];

    for (let gi = 0; gi < groupsOfParticipants.length; gi++) {
      const groupParticipants = groupsOfParticipants[gi];
      if (groupParticipants.length < 2) continue; // grupo sin suficientes equipos para jugar

      const group = await tx.tournamentGroup.create({
        data: { tournamentId, name: data.groupCount > 1 ? `Grupo ${String.fromCharCode(65 + gi)}` : "General" },
      });

      const tournamentTeams = [];
      for (const p of groupParticipants) {
        const tt = await tx.tournamentTeam.create({
          data: {
            tournamentId,
            groupId: group.id,
            teamId: p.teamId ?? null,
            externalTeamName: p.teamId ? null : p.externalTeamName ?? null,
          },
          include: { team: { select: { name: true, categoryId: true } } },
        });
        tournamentTeams.push(tt);
      }

      const fixtures = generateRoundRobin(groupParticipants.length, data.doubleRound);
      for (const f of fixtures) {
        const home = tournamentTeams[f.homeIndex];
        const away = tournamentTeams[f.awayIndex];
        const ourTeamId = home.teamId ?? away.teamId;
        if (!ourTeamId) continue; // enfrentamiento entre dos equipos externos: no aplica en este club

        const isHomeOurs = home.teamId === ourTeamId;
        const opponent = isHomeOurs ? away : home;
        const ourTeam = isHomeOurs ? home : away;

        const matchDate = new Date(data.firstMatchDate);
        matchDate.setDate(matchDate.getDate() + (f.round - 1) * data.daysBetweenRounds);

        const match = await tx.match.create({
          data: {
            clubId,
            competition: tournament.name,
            tournamentId,
            categoryId: ourTeam.team?.categoryId ?? tournament.categoryId,
            teamId: ourTeamId,
            opponentName: participantLabel(opponent),
            date: matchDate,
            time: "17:00",
            isHome: isHomeOurs,
            status: "SCHEDULED",
          },
        });
        createdMatches.push(match.id);
      }
    }

    await tx.tournament.update({ where: { id: tournamentId }, data: { status: "IN_PROGRESS" } });

    return { matchesCreated: createdMatches.length };
  });
}

export async function getTournamentDetail(clubId: number, id: number) {
  const tournament = await prisma.tournament.findFirstOrThrow({
    where: { id, clubId },
    include: {
      category: true,
      groups: {
        include: {
          teams: { include: { team: { select: { id: true, name: true } } } },
        },
      },
      matches: {
        include: { team: { select: { id: true, name: true } } },
        orderBy: { date: "asc" },
      },
    },
  });

  // Tabla de posiciones por grupo, calculada a partir de los partidos finalizados
  // (src/server/logic/fixtures.ts:computeStandings, cubierto por pruebas unitarias).
  const standingsByGroup = tournament.groups.map((group) => {
    const groupTeamKeys = new Map(
      group.teams.map((gt) => [gt.teamId ? `team:${gt.teamId}` : `ext:${gt.externalTeamName}`, gt.team?.name ?? gt.externalTeamName ?? "Rival"])
    );

    const results = tournament.matches
      .filter((m) => m.status === "FINISHED" && m.resultTeamScore !== null && m.resultOpponentScore !== null)
      .flatMap((m) => {
        const ourKey = `team:${m.teamId}`;
        if (!groupTeamKeys.has(ourKey)) return [];
        // Nuestro equipo siempre tiene fila propia; el rival puede ser externo (no tiene fila salvo que tambien sea nuestro)
        const rows = [
          { teamKey: ourKey, isHome: m.isHome, scoreFor: m.resultTeamScore!, scoreAgainst: m.resultOpponentScore! },
        ];
        const opponentKey = `ext:${m.opponentName}`;
        if (groupTeamKeys.has(opponentKey)) {
          rows.push({ teamKey: opponentKey, isHome: !m.isHome, scoreFor: m.resultOpponentScore!, scoreAgainst: m.resultTeamScore! });
        }
        return rows;
      });

    const standings = computeStandings(results).map((row) => ({ ...row, teamName: groupTeamKeys.get(row.teamKey) ?? row.teamKey }));

    return { group, standings };
  });

  return { tournament, standingsByGroup };
}
