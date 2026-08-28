import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { delegateSchema } from "@/server/validators/staff";
import { updateDelegate } from "@/server/services/staff.service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "delegates:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = delegateSchema.parse(body);
    const delegate = await updateDelegate(clubId, Number(params.id), data);
    return jsonOk({ delegate });
  } catch (err) {
    return handleApiError(err);
  }
}
