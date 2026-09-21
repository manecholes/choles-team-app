import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveBase64File } from "@/lib/storage";
import { getPublicClub } from "@/lib/public-club";
import type { z } from "zod";
import type { productSchema } from "@/server/validators/product";

type ProductInput = z.infer<typeof productSchema>;

export async function listProducts(clubId: number) {
  return prisma.product.findMany({
    where: { clubId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

/** Para la pagina publica /tienda (sin sesion) -- catalogo, no hay compra en linea. */
export async function listPublicProducts() {
  const club = await getPublicClub();
  if (!club) return [];
  return listProducts(club.id);
}

function resolvePrice(price: ProductInput["price"]) {
  return price === undefined ? null : price;
}

export async function createProduct(clubId: number, data: ProductInput) {
  let imagePath: string | null = null;
  let imageMimeType: string | null = null;
  if (data.image) {
    const saved = await saveBase64File(`site/products/${clubId}`, data.image.fileName, data.image.base64Data);
    imagePath = saved.relativePath;
    imageMimeType = data.image.mimeType;
  }
  return prisma.product.create({
    data: {
      clubId,
      name: data.name,
      description: data.description || null,
      price: resolvePrice(data.price),
      category: data.category,
      available: data.available,
      sortOrder: data.sortOrder ?? 0,
      imagePath,
      imageMimeType,
    },
  });
}

export async function updateProduct(clubId: number, id: number, data: ProductInput) {
  const existing = await prisma.product.findFirstOrThrow({ where: { id, clubId } });
  let imagePath = existing.imagePath;
  let imageMimeType = existing.imageMimeType;
  if (data.image) {
    const saved = await saveBase64File(`site/products/${clubId}`, data.image.fileName, data.image.base64Data);
    if (existing.imagePath) await deleteStoredFile(existing.imagePath);
    imagePath = saved.relativePath;
    imageMimeType = data.image.mimeType;
  }
  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      price: resolvePrice(data.price),
      category: data.category,
      available: data.available,
      sortOrder: data.sortOrder ?? 0,
      imagePath,
      imageMimeType,
    },
  });
}

export async function deleteProduct(clubId: number, id: number) {
  const existing = await prisma.product.findFirstOrThrow({ where: { id, clubId } });
  if (existing.imagePath) await deleteStoredFile(existing.imagePath);
  await prisma.product.delete({ where: { id } });
}
