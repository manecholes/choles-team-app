import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  minAge: z.coerce.number().int().min(4).max(99),
  maxAge: z.coerce.number().int().min(4).max(99),
  branch: z.enum(["MASCULINO", "FEMENINO", "MIXTO"]),
  coachId: z.coerce.number().int().positive().optional().nullable(),
  schedule: z.string().max(150).optional().nullable(),
  court: z.string().max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
}).refine((d) => d.maxAge >= d.minAge, {
  message: "La edad maxima debe ser mayor o igual a la minima",
  path: ["maxAge"],
});

export const teamSchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: z.coerce.number().int().positive(),
  branch: z.enum(["MASCULINO", "FEMENINO", "MIXTO"]),
  coachId: z.coerce.number().int().positive().optional().nullable(),
  delegateId: z.coerce.number().int().positive().optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  seasonId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
