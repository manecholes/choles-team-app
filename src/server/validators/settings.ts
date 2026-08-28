import { z } from "zod";

export const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(2000),
});

export const clubSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener minusculas, numeros y guiones"),
  logoUrl: z.string().max(500).optional().nullable(),
  primaryColor: z.string().max(20).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const createAdminSchema = z.object({
  clubId: z.coerce.number().int().positive(),
  email: z.string().email(),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});
