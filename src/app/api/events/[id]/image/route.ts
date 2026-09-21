import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getFileAbsolutePath } from "@/lib/storage";

/**
 * Sirve la imagen de un evento del sitio publico (cholesteam.com/eventos).
 * Publica a proposito, igual que la pagina que la muestra (ver
 * middleware.ts PUBLIC_PATHS).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await prisma.clubEvent.findUniqueOrThrow({ where: { id: Number(params.id) } });
    if (!event.imagePath) {
      return NextResponse.json({ error: "Este evento no tiene imagen" }, { status: 404 });
    }
    const buffer = await fs.readFile(getFileAbsolutePath(event.imagePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": event.imageMimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
}
