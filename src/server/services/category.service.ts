import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { categorySchema } from "@/server/validators/team";

type CategoryInput = z.infer<typeof categorySchema>;

export async function listCategories(clubId: number) {
  return prisma.category.findMany({
    where: { clubId },
    include: {
      coach: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { players: true, teams: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(clubId: number, data: CategoryInput) {
  return prisma.category.create({
    data: {
      clubId,
      name: data.name,
      minAge: data.minAge,
      maxAge: data.maxAge,
      branch: data.branch,
      coachId: data.coachId || null,
      schedule: data.schedule || null,
      court: data.court || null,
      status: data.status,
    },
  });
}

export async function updateCategory(clubId: number, id: number, data: CategoryInput) {
  await prisma.category.findFirstOrThrow({ where: { id, clubId } });
  return prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      minAge: data.minAge,
      maxAge: data.maxAge,
      branch: data.branch,
      coachId: data.coachId || null,
      schedule: data.schedule || null,
      court: data.court || null,
      status: data.status,
    },
  });
}

export async function deleteCategory(clubId: number, id: number) {
  await prisma.category.findFirstOrThrow({ where: { id, clubId } });
  const teamsCount = await prisma.team.count({ where: { categoryId: id } });
  const playersCount = await prisma.player.count({ where: { categoryId: id } });
  if (teamsCount > 0 || playersCount > 0) {
    throw new Error(
      "No se puede eliminar: la categoria tiene equipos o jugadores asociados. Reasignalos primero."
    );
  }
  await prisma.category.delete({ where: { id } });
}
