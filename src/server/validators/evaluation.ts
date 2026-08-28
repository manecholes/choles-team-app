import { z } from "zod";

export const physicalTestSchema = z.object({
  category: z.enum(["ANTHROPOMETRY", "SPEED", "AGILITY", "JUMP", "ENDURANCE", "STRENGTH"]),
  testName: z.string().min(1).max(60),
  value: z.coerce.number(),
  unit: z.string().min(1).max(20),
  notes: z.string().max(500).optional().nullable(),
});

export const evaluationSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  notes: z.string().max(2000).optional().nullable(),
  tests: z.array(physicalTestSchema).min(1, "Agrega al menos una prueba"),
});

export const loadEntrySchema = z.object({
  playerId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  rpe: z.coerce.number().int().min(0).max(10),
  durationMinutes: z.coerce.number().int().positive(),
  trainingSessionId: z.coerce.number().int().positive().optional().nullable(),
  matchId: z.coerce.number().int().positive().optional().nullable(),
});
