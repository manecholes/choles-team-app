import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { removeGuardianLink } from "@/server/services/player.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; guardianId: string } }
) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "players:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await removeGuardianLink(clubId, Number(params.id), Number(params.guardianId));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
