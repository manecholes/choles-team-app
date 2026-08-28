import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { coachSchema } from "@/server/validators/staff";
import { createCoach, listCoaches } from "@/server/services/staff.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "coaches:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ coaches: [] });
    const coaches = await listCoaches(clubId);
    return jsonOk({ coaches });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "coaches:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = coachSchema.parse(body);
    const coach = await createCoach(clubId, data);
    return jsonOk({ coach }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
