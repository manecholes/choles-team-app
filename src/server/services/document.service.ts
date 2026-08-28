import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveBase64File } from "@/lib/storage";
import type { z } from "zod";
import type { uploadDocumentSchema } from "@/server/validators/document";

type UploadInput = z.infer<typeof uploadDocumentSchema>;

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadPlayerDocument(
  clubId: number,
  playerId: number,
  uploadedById: number,
  data: UploadInput
) {
  await prisma.player.findFirstOrThrow({ where: { id: playerId, clubId } });

  const saved = await saveBase64File(`documents/${clubId}/${playerId}`, data.fileName, data.base64Data);
  if (saved.sizeBytes > MAX_SIZE_BYTES) {
    await deleteStoredFile(saved.relativePath);
    throw new Error("El archivo supera el tamano maximo permitido (10 MB)");
  }

  return prisma.document.create({
    data: {
      clubId,
      playerId,
      type: data.type,
      fileName: data.fileName,
      filePath: saved.relativePath,
      mimeType: data.mimeType,
      sizeBytes: saved.sizeBytes,
      uploadedById,
    },
  });
}

export async function listPlayerDocuments(clubId: number, playerId: number) {
  return prisma.document.findMany({ where: { clubId, playerId }, orderBy: { uploadedAt: "desc" } });
}

export async function listAllDocuments(clubId: number, filters: { type?: string; playerId?: number } = {}) {
  const where: any = { clubId };
  if (filters.type) where.type = filters.type;
  if (filters.playerId) where.playerId = filters.playerId;
  return prisma.document.findMany({
    where,
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function deleteDocument(clubId: number, documentId: number) {
  const doc = await prisma.document.findFirstOrThrow({ where: { id: documentId, clubId } });
  await deleteStoredFile(doc.filePath);
  await prisma.document.delete({ where: { id: documentId } });
}
