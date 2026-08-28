import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { getGuardianChildrenIds } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

/** Jugadores (hijos) vinculados al padre/tutor autenticado. Usado por vistas de solo-lectura (rendimiento, mi-hijo). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (user.role !== "GUARDIAN") return jsonOk({ children: [] });
    const ids = await getGuardianChildrenIds(user.userId);
    const children = await prisma.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    });
    return jsonOk({ children });
  } catch (err) {
    return handleApiError(err);
  }
}
