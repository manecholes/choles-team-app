import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { teamPlayerSchema } from "@/server/validators/team";
import { addPlayerToTeam } from "@/server/services/team.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "teams:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = teamPlayerSchema.parse(body);
    const teamPlayer = await addPlayerToTeam(clubId, Number(params.id), data);
    return jsonOk({ teamPlayer }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
