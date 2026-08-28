import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsTeam } from "@/lib/scope";
import { matchSchema } from "@/server/validators/match";
import { deleteMatch, getMatchForStats, updateMatch } from "@/server/services/match.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["matches:read", "matches:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const detail = await getMatchForStats(clubId, Number(params.id));
    return jsonOk(detail);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["matches:write", "matches:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const existing = await prisma.match.findFirstOrThrow({ where: { id: Number(params.id), clubId } });
    await assertCoachOwnsTeam(user, existing.teamId);
    const body = await req.json();
    const data = matchSchema.parse(body);
    const match = await updateMatch(clubId, Number(params.id), data);
    return jsonOk({ match });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["matches:write", "matches:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const existing = await prisma.match.findFirstOrThrow({ where: { id: Number(params.id), clubId } });
    await assertCoachOwnsTeam(user, existing.teamId);
    await deleteMatch(clubId, Number(params.id));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
