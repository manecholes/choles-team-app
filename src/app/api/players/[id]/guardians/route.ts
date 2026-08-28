import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { playerGuardianSchema } from "@/server/validators/player";
import { addOrLinkGuardian } from "@/server/services/player.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "players:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = playerGuardianSchema.parse(body);
    const link = await addOrLinkGuardian(clubId, Number(params.id), data);
    return jsonOk({ link }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
