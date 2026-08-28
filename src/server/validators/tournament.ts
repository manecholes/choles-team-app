import { z } from "zod";

export const tournamentSchema = z.object({
  name: z.string().min(1).max(150),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "FINISHED"]).default("PLANNED"),
});

const participantSchema = z.object({
  teamId: z.coerce.number().int().positive().optional(),
  externalTeamName: z.string().min(1).max(150).optional(),
});

export const generateFixtureSchema = z
  .object({
    participants: z.array(participantSchema).min(2, "Se necesitan al menos 2 equipos"),
    groupCount: z.coerce.number().int().min(1).max(8).default(1),
    doubleRound: z.coerce.boolean().default(false),
    firstMatchDate: z.coerce.date(),
    daysBetweenRounds: z.coerce.number().int().min(1).max(30).default(7),
  })
  .refine((d) => d.participants.every((p) => p.teamId || p.externalTeamName), {
    message: "Cada participante debe tener un equipo del club o un nombre de equipo externo",
  });
