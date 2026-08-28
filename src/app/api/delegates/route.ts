import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { delegateSchema } from "@/server/validators/staff";
import { createDelegate, listDelegates } from "@/server/services/staff.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "delegates:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ delegates: [] });
    const delegates = await listDelegates(clubId);
    return jsonOk({ delegates });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "delegates:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = delegateSchema.parse(body);
    const delegate = await createDelegate(clubId, data);
    return jsonOk({ delegate }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
