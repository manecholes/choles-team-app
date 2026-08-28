import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsTeam, getCoachTeamIds } from "@/lib/scope";
import { matchSchema } from "@/server/validators/match";
import { createMatch, listMatches } from "@/server/services/match.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["matches:read", "matches:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ matches: [] });

    const { searchParams } = new URL(req.url);
    const requestedTeamId = searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined;

    let teamIds: number[] | undefined;
    if (user.role === "COACH") {
      const own = await getCoachTeamIds(user.userId);
      teamIds = requestedTeamId ? own.filter((id) => id === requestedTeamId) : own;
    }

    const matches = await listMatches(clubId, {
      teamId: teamIds ? undefined : requestedTeamId,
      teamIds,
      status: searchParams.get("status") ?? undefined,
    });
    return jsonOk({ matches });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["matches:write", "matches:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = matchSchema.parse(body);
    await assertCoachOwnsTeam(user, data.teamId);
    const match = await createMatch(clubId, user.userId, data);
    return jsonOk({ match }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
