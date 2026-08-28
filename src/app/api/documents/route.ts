import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { listAllDocuments } from "@/server/services/document.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "documents:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ documents: [] });
    const { searchParams } = new URL(req.url);
    const documents = await listAllDocuments(clubId, {
      type: searchParams.get("type") ?? undefined,
      playerId: searchParams.get("playerId") ? Number(searchParams.get("playerId")) : undefined,
    });
    return jsonOk({ documents });
  } catch (err) {
    return handleApiError(err);
  }
}
