import { z } from "zod";

export const paymentConceptSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(["MATRICULA", "MENSUALIDAD", "INSCRIPCION", "UNIFORME", "TORNEO", "OTRO"]),
  defaultAmount: z.coerce.number().min(0).optional().nullable(),
  active: z.coerce.boolean().default(true),
});

export const paymentSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  conceptId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date().optional().nullable(),
  periodLabel: z.string().max(20).optional().nullable(),
  status: z.enum(["PAID", "PENDING", "OVERDUE"]).default("PENDING"),
  method: z.enum(["EFECTIVO", "TRANSFERENCIA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA"]).optional().nullable(),
  paymentDate: z.coerce.date().optional().nullable(),
});

export const markPaidSchema = z.object({
  method: z.enum(["EFECTIVO", "TRANSFERENCIA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA"]),
  paymentDate: z.coerce.date().optional(),
});
