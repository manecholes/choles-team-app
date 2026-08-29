import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(1, "La contrasena es requerida"),
});

/**
 * Usado por el administrador para crear el acceso (login) de un
 * entrenador, delegado o padre/tutor ya registrado, desde su propia
 * pantalla de gestion (ver "Crear acceso" en Entrenadores/Delegados y
 * en la pestana "Familia" del jugador).
 */
export const createAccessSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una mayuscula")
    .regex(/[0-9]/, "Debe incluir al menos un numero"),
});

/**
 * Usado por el administrador para restablecer la contrasena de un
 * entrenador, delegado o padre/tutor que YA tiene acceso creado (por
 * ejemplo, porque la olvido). No pide la contrasena actual: quien la usa
 * ya paso por el control de permisos de "coaches:write" / "delegates:write"
 * / "guardians:write" en la ruta correspondiente.
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una mayuscula")
    .regex(/[0-9]/, "Debe incluir al menos un numero"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, "Minimo 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir al menos una mayuscula")
      .regex(/[0-9]/, "Debe incluir al menos un numero"),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "La nueva contrasena debe ser diferente a la actual",
    path: ["newPassword"],
  });
