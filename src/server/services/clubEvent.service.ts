import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveBase64File } from "@/lib/storage";
import { getPublicClub } from "@/lib/public-club";
import type { z } from "zod";
import type { clubEventSchema } from "@/server/validators/clubEvent";

type ClubEventInput = z.infer<typeof clubEventSchema>;

export async function listClubEvents(clubId: number) {
  return prisma.clubEvent.findMany({ where: { clubId }, orderBy: { date: "desc" } });
}

/** Para la pagina publica /eventos (sin sesion). */
export async function listPublicClubEvents() {
  const club = await getPublicClub();
  if (!club) return [];
  return listClubEvents(club.id);
}

export async function createClubEvent(clubId: number, data: ClubEventInput) {
  let imagePath: string | null = null;
  let imageMimeType: string | null = null;
  if (data.image) {
    const saved = await saveBase64File(`site/events/${clubId}`, data.image.fileName, data.image.base64Data);
    imagePath = saved.relativePath;
    imageMimeType = data.image.mimeType;
  }
  return prisma.clubEvent.create({
    data: {
      clubId,
      title: data.title,
      description: data.description || null,
      date: data.date,
      timeLabel: data.timeLabel || null,
      location: data.location || null,
      imagePath,
      imageMimeType,
    },
  });
}

export async function updateClubEvent(clubId: number, id: number, data: ClubEventInput) {
  const existing = await prisma.clubEvent.findFirstOrThrow({ where: { id, clubId } });
  let imagePath = existing.imagePath;
  let imageMimeType = existing.imageMimeType;
  if (data.image) {
    const saved = await saveBase64File(`site/events/${clubId}`, data.image.fileName, data.image.base64Data);
    if (existing.imagePath) await deleteStoredFile(existing.imagePath);
    imagePath = saved.relativePath;
    imageMimeType = data.image.mimeType;
  }
  return prisma.clubEvent.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      date: data.date,
      timeLabel: data.timeLabel || null,
      location: data.location || null,
      imagePath,
      imageMimeType,
    },
  });
}

export async function deleteClubEvent(clubId: number, id: number) {
  const existing = await prisma.clubEvent.findFirstOrThrow({ where: { id, clubId } });
  if (existing.imagePath) await deleteStoredFile(existing.imagePath);
  await prisma.clubEvent.delete({ where: { id } });
}
