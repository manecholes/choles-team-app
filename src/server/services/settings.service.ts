import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { z } from "zod";
import type { clubSchema, createAdminSchema, settingSchema } from "@/server/validators/settings";

type SettingInput = z.infer<typeof settingSchema>;
type ClubInput = z.infer<typeof clubSchema>;
type CreateAdminInput = z.infer<typeof createAdminSchema>;

export async function listSettings(clubId: number) {
  return prisma.setting.findMany({ where: { clubId }, orderBy: { key: "asc" } });
}

/** Crea o actualiza una configuracion del club (clave/valor). */
export async function upsertSetting(clubId: number, data: SettingInput) {
  return prisma.setting.upsert({
    where: { clubId_key: { clubId, key: data.key } },
    update: { value: data.value },
    create: { clubId, key: data.key, value: data.value },
  });
}

/** Listado de clubes (punto 23: multi-club), solo para SUPER_ADMIN. */
export async function listClubs() {
  return prisma.club.findMany({
    include: { _count: { select: { players: true, teams: true, users: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createClub(data: ClubInput) {
  return prisma.club.create({
    data: {
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl || null,
      primaryColor: data.primaryColor || null,
      active: data.active ?? true,
    },
  });
}

/** Crea un usuario ADMIN para un club (punto 3: "SUPER_ADMIN puede crear administradores"). */
export async function createClubAdmin(data: CreateAdminInput) {
  await prisma.club.findUniqueOrThrow({ where: { id: data.clubId } });
  const passwordHash = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      clubId: data.clubId,
      email: data.email,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    },
    select: { id: true, email: true, role: true, clubId: true },
  });
}

export async function updateClub(id: number, data: Partial<ClubInput>) {
  await prisma.club.findUniqueOrThrow({ where: { id } });
  return prisma.club.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
      ...(data.primaryColor !== undefined ? { primaryColor: data.primaryColor || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
}
