import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { getMessageDetail } from "@/server/services/communication.service";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "communications:read");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const message = await getMessageDetail(clubId, Number(params.id));
    return jsonOk({ message });
  } catch (err) {
    return handleApiError(err);
  }
}
