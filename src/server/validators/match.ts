import { z } from "zod";

export const matchSchema = z.object({
  competition: z.string().max(150).optional().nullable(),
  tournamentId: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  teamId: z.coerce.number().int().positive(),
  opponentName: z.string().min(1).max(150),
  date: z.coerce.date(),
  time: z.string().min(1).max(10),
  venue: z.string().max(150).optional().nullable(),
  isHome: z.coerce.boolean().default(true),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "FINISHED", "CANCELLED"]).default("SCHEDULED"),
  resultTeamScore: z.coerce.number().int().min(0).optional().nullable(),
  resultOpponentScore: z.coerce.number().int().min(0).optional().nullable(),
});

export const matchStatisticSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  points: z.coerce.number().int().min(0).default(0),
  rebounds: z.coerce.number().int().min(0).default(0),
  assists: z.coerce.number().int().min(0).default(0),
  steals: z.coerce.number().int().min(0).default(0),
  blocks: z.coerce.number().int().min(0).default(0),
  turnovers: z.coerce.number().int().min(0).default(0),
  fouls: z.coerce.number().int().min(0).default(0),
  minutesPlayed: z.coerce.number().int().min(0).max(60).default(0),
  fieldGoalsMade: z.coerce.number().int().min(0).default(0),
  fieldGoalsAtt: z.coerce.number().int().min(0).default(0),
  threePointsMade: z.coerce.number().int().min(0).default(0),
  threePointsAtt: z.coerce.number().int().min(0).default(0),
  freeThrowsMade: z.coerce.number().int().min(0).default(0),
  freeThrowsAtt: z.coerce.number().int().min(0).default(0),
});

export const matchStatisticsBatchSchema = z.object({
  stats: z.array(matchStatisticSchema),
  resultTeamScore: z.coerce.number().int().min(0).optional(),
  resultOpponentScore: z.coerce.number().int().min(0).optional(),
});
