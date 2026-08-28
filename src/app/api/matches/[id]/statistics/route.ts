import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsTeam } from "@/lib/scope";
import { matchStatisticsBatchSchema } from "@/server/validators/match";
import { saveMatchStatistics } from "@/server/services/match.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["matches:write", "matches:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const matchId = Number(params.id);
    const existing = await prisma.match.findFirstOrThrow({ where: { id: matchId, clubId } });
    await assertCoachOwnsTeam(user, existing.teamId);

    const body = await req.json();
    const data = matchStatisticsBatchSchema.parse(body);
    const result = await saveMatchStatistics(clubId, matchId, data);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
