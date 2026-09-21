import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveBase64File } from "@/lib/storage";
import { getPublicClub } from "@/lib/public-club";
import type { z } from "zod";
import type { gallerySchema } from "@/server/validators/gallery";

type GalleryInput = z.infer<typeof gallerySchema>;

export async function listGalleryImages(clubId: number) {
  return prisma.galleryImage.findMany({
    where: { clubId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

/** Para las paginas publicas del sitio (sin sesion). */
export async function listPublicGalleryImages() {
  const club = await getPublicClub();
  if (!club) return [];
  return listGalleryImages(club.id);
}

export async function createGalleryImage(clubId: number, data: GalleryInput) {
  let imagePath: string | null = null;
  let imageMimeType: string | null = null;
  if (data.image) {
    const saved = await saveBase64File(`site/gallery/${clubId}`, data.image.fileName, data.image.base64Data);
    imagePath = saved.relativePath;
    imageMimeType = data.image.mimeType;
  }
  return prisma.galleryImage.create({
    data: {
      clubId,
      title: data.title,
      description: data.description || null,
      sortOrder: data.sortOrder ?? 0,
      imagePath,
      imageMimeType,
    },
  });
}

export async function updateGalleryImage(clubId: number, id: number, data: GalleryInput) {
  const existing = await prisma.galleryImage.findFirstOrThrow({ where: { id, clubId } });
  let imagePath = existing.imagePath;
  let imageMimeType = existing.imageMimeType;
  if (data.image) {
    const saved = await saveBase64File(`site/gallery/${clubId}`, data.image.fileName, data.image.base64Data);
    if (existing.imagePath) await deleteStoredFile(existing.imagePath);
    imagePath = saved.relativePath;
    imageMimeType = data.image.mimeType;
  }
  return prisma.galleryImage.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      sortOrder: data.sortOrder ?? 0,
      imagePath,
      imageMimeType,
    },
  });
}

export async function deleteGalleryImage(clubId: number, id: number) {
  const existing = await prisma.galleryImage.findFirstOrThrow({ where: { id, clubId } });
  if (existing.imagePath) await deleteStoredFile(existing.imagePath);
  await prisma.galleryImage.delete({ where: { id } });
}
