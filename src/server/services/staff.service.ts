import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword, ForbiddenError } from "@/lib/auth";
import type { z } from "zod";
import type { coachSchema, delegateSchema } from "@/server/validators/staff";

type CoachInput = z.infer<typeof coachSchema>;
type DelegateInput = z.infer<typeof delegateSchema>;

export async function listCoaches(clubId: number) {
  return prisma.coach.findMany({
    where: { clubId },
    include: {
      _count: { select: { teams: true, categories: true } },
      user: { select: { id: true, email: true } },
    },
    orderBy: { lastName: "asc" },
  });
}

/**
 * Crea el acceso (usuario/contrasena) para un entrenador ya registrado.
 * Ver "REQUISITO IMPORTANTE" del maestro: registrar a alguien no basta,
 * necesita poder iniciar sesion de verdad. El registro del entrenador
 * (nombre, telefono, etc.) y su login son cosas separadas a proposito,
 * para que el club pueda tener entrenadores sin acceso a la app.
 */
export async function createCoachUserAccess(clubId: number, coachId: number, email: string, password: string) {
  const coach = await prisma.coach.findFirstOrThrow({
    where: { id: coachId, clubId },
    include: { user: true },
  });
  if (coach.user) {
    throw new ForbiddenError("Este entrenador ya tiene un acceso creado");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { clubId, email, passwordHash, role: "COACH", coachId, mustChangePassword: true },
    select: { id: true, email: true, role: true },
  });
}

/**
 * Restablece la contrasena de un entrenador que YA tiene acceso creado
 * (por ejemplo, si la olvido). Vuelve a marcar mustChangePassword para que
 * tenga que definir una nueva la proxima vez que inicie sesion.
 */
export async function resetCoachPassword(clubId: number, coachId: number, password: string) {
  const coach = await prisma.coach.findFirstOrThrow({
    where: { id: coachId, clubId },
    include: { user: true },
  });
  if (!coach.user) {
    throw new ForbiddenError("Este entrenador todavia no tiene un acceso creado");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.update({
    where: { id: coach.user.id },
    data: { passwordHash, mustChangePassword: true },
    select: { id: true, email: true, role: true },
  });
}

export async function createCoach(clubId: number, data: CoachInput) {
  return prisma.coach.create({
    data: {
      clubId,
      firstName: data.firstName,
      lastName: data.lastName,
      documentId: data.documentId || null,
      phone: data.phone || null,
      email: data.email || null,
      specialty: data.specialty || null,
      active: data.active,
    },
  });
}

export async function updateCoach(clubId: number, id: number, data: CoachInput) {
  await prisma.coach.findFirstOrThrow({ where: { id, clubId } });
  return prisma.coach.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      documentId: data.documentId || null,
      phone: data.phone || null,
      email: data.email || null,
      specialty: data.specialty || null,
      active: data.active,
    },
  });
}

/**
 * Elimina definitivamente a un entrenador. Si tenia un acceso (usuario)
 * creado, tambien se elimina para no dejar una cuenta huerfana con un
 * correo que ya no se podria volver a usar en un nuevo acceso.
 */
export async function deleteCoach(clubId: number, id: number) {
  const coach = await prisma.coach.findFirstOrThrow({ where: { id, clubId }, include: { user: true } });
  await prisma.$transaction(async (tx) => {
    if (coach.user) {
      await tx.user.delete({ where: { id: coach.user.id } });
    }
    await tx.coach.delete({ where: { id } });
  });
}

export async function listDelegates(clubId: number) {
  return prisma.delegate.findMany({
    where: { clubId },
    include: {
      _count: { select: { teams: true } },
      user: { select: { id: true, email: true } },
    },
    orderBy: { lastName: "asc" },
  });
}

/** Restablece la contrasena de un delegado que YA tiene acceso creado. */
export async function resetDelegatePassword(clubId: number, delegateId: number, password: string) {
  const delegate = await prisma.delegate.findFirstOrThrow({
    where: { id: delegateId, clubId },
    include: { user: true },
  });
  if (!delegate.user) {
    throw new ForbiddenError("Este delegado todavia no tiene un acceso creado");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.update({
    where: { id: delegate.user.id },
    data: { passwordHash, mustChangePassword: true },
    select: { id: true, email: true, role: true },
  });
}

export async function createDelegate(clubId: number, data: DelegateInput) {
  return prisma.delegate.create({
    data: {
      clubId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      active: data.active,
    },
  });
}

export async function updateDelegate(clubId: number, id: number, data: DelegateInput) {
  await prisma.delegate.findFirstOrThrow({ where: { id, clubId } });
  return prisma.delegate.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      active: data.active,
    },
  });
}

export async function deleteDelegate(clubId: number, id: number) {
  await prisma.delegate.findFirstOrThrow({ where: { id, clubId } });
  await prisma.delegate.update({ where: { id }, data: { active: false } });
}

/** Crea el acceso (usuario/contrasena) para un delegado ya registrado. */
export async function createDelegateUserAccess(clubId: number, delegateId: number, email: string, password: string) {
  const delegate = await prisma.delegate.findFirstOrThrow({
    where: { id: delegateId, clubId },
    include: { user: true },
  });
  if (delegate.user) {
    throw new ForbiddenError("Este delegado ya tiene un acceso creado");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { clubId, email, passwordHash, role: "DELEGATE", delegateId, mustChangePassword: true },
    select: { id: true, email: true, role: true },
  });
}
