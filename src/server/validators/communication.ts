import { z } from "zod";

export const communicationSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    audienceType: z.enum(["ALL", "CATEGORY", "TEAM", "GUARDIANS", "PLAYERS", "COACHES"]),
    categoryId: z.coerce.number().int().positive().optional().nullable(),
    teamId: z.coerce.number().int().positive().optional().nullable(),
  })
  .refine((data) => data.audienceType !== "CATEGORY" || !!data.categoryId, {
    message: "Selecciona una categoria para este destinatario",
    path: ["categoryId"],
  })
  .refine((data) => data.audienceType !== "TEAM" || !!data.teamId, {
    message: "Selecciona un equipo para este destinatario",
    path: ["teamId"],
  });
