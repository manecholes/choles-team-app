import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { teamSchema } from "@/server/validators/team";
import { createTeam, listTeams } from "@/server/services/team.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "teams:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ teams: [] });
    const { searchParams } = new URL(req.url);
    const teams = await listTeams(clubId, {
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
    });
    return jsonOk({ teams });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "teams:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = teamSchema.parse(body);
    const team = await createTeam(clubId, data);
    return jsonOk({ team }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
