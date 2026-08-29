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

// Vincula (o edita el numero/posicion de) un jugador existente a un equipo,
// desde la pantalla de detalle del equipo (punto 7 del maestro: la
// plantilla debe poder gestionarse, no solo mostrarse).
export const teamPlayerSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
});
