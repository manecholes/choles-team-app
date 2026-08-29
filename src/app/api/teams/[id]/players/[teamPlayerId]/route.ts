import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { removePlayerFromTeam } from "@/server/services/team.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; teamPlayerId: string } }
) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "teams:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await removePlayerFromTeam(clubId, Number(params.id), Number(params.teamPlayerId));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
