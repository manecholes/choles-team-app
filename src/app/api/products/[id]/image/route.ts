import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getFileAbsolutePath } from "@/lib/storage";

/**
 * Sirve la foto de un producto del catalogo publico (cholesteam.com/tienda).
 * Publica a proposito, igual que la pagina que la muestra (ver
 * middleware.ts PUBLIC_PATHS). La tienda es solo catalogo -- no hay compra
 * en linea (punto pedido por el usuario: "no es para compras online sino
 * para ver, para mostrar los productos que vendemos").
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: Number(params.id) } });
    if (!product.imagePath) {
      return NextResponse.json({ error: "Este producto no tiene imagen" }, { status: 404 });
    }
    const buffer = await fs.readFile(getFileAbsolutePath(product.imagePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": product.imageMimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
}
