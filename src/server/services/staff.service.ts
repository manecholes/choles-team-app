import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { coachSchema, delegateSchema } from "@/server/validators/staff";

type CoachInput = z.infer<typeof coachSchema>;
type DelegateInput = z.infer<typeof delegateSchema>;

export async function listCoaches(clubId: number) {
  return prisma.coach.findMany({
    where: { clubId },
    include: { _count: { select: { teams: true, categories: true } } },
    orderBy: { lastName: "asc" },
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

export async function deleteCoach(clubId: number, id: number) {
  await prisma.coach.findFirstOrThrow({ where: { id, clubId } });
  await prisma.coach.update({ where: { id }, data: { active: false } });
}

export async function listDelegates(clubId: number) {
  return prisma.delegate.findMany({
    where: { clubId },
    include: { _count: { select: { teams: true } } },
    orderBy: { lastName: "asc" },
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
