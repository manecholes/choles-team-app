import { z } from "zod";

export const calendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["TRAINING", "MATCH", "TOURNAMENT", "MEETING", "EVALUATION", "OTHER"]),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  location: z.string().max(200).optional().nullable(),
  teamId: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  recurrenceRule: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional().default("NONE"),
  recurrenceCount: z.coerce.number().int().min(1).max(52).optional().default(1),
});
