import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { playerSchema } from "@/server/validators/player";
import { createPlayer, listPlayers } from "@/server/services/player.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "players:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ players: [] });

    const { searchParams } = new URL(req.url);
    const players = await listPlayers(clubId, {
      search: searchParams.get("search") ?? undefined,
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
      teamId: searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return jsonOk({ players });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "players:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Se requiere un club para crear jugadores");

    const body = await req.json();
    const data = playerSchema.parse(body);
    const player = await createPlayer(clubId, data);

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "CREATE", entity: "Player", entityId: player.id },
    });

    return jsonOk({ player }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
