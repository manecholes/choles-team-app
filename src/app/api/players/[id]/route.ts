import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { playerSchema } from "@/server/validators/player";
import { deletePlayer, getPlayerProfile, updatePlayer } from "@/server/services/player.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "players:read");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const profile = await getPlayerProfile(clubId, Number(params.id));
    return jsonOk(profile);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "players:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = playerSchema.parse(body);
    const player = await updatePlayer(clubId, Number(params.id), data);

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "UPDATE", entity: "Player", entityId: player.id },
    });

    return jsonOk({ player });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "players:delete");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await deletePlayer(clubId, Number(params.id));

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "DELETE", entity: "Player", entityId: Number(params.id) },
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
