import { z } from "zod";

export const playerSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido").max(100),
  lastName: z.string().min(1, "El apellido es requerido").max(100),
  documentId: z.string().max(30).optional().nullable(),
  birthDate: z.coerce.date({ errorMap: () => ({ message: "Fecha de nacimiento invalida" }) }),
  sex: z.enum(["M", "F"]),
  photoUrl: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  eps: z.string().max(100).optional().nullable(),
  emergencyContactName: z.string().max(150).optional().nullable(),
  emergencyContactPhone: z.string().max(30).optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  position: z.string().max(50).optional().nullable(),
  heightCm: z.coerce.number().positive().max(260).optional().nullable(),
  weightKg: z.coerce.number().positive().max(250).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "INJURED", "SUSPENDED"]).default("ACTIVE"),
  joinDate: z.coerce.date().optional(),
  observations: z.string().max(3000).optional().nullable(),
});

export type PlayerInput = z.infer<typeof playerSchema>;

export const playerGuardianSchema = z.object({
  guardianId: z.coerce.number().int().positive().optional(), // si se envia, vincula un tutor existente
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  documentId: z.string().max(30).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().max(255).optional().nullable(),
  relationship: z.enum(["MADRE", "PADRE", "TUTOR", "OTRO"]),
  isPrimaryContact: z.coerce.boolean().default(false),
  canViewPayments: z.coerce.boolean().default(true),
  canViewEvaluations: z.coerce.boolean().default(true),
});
