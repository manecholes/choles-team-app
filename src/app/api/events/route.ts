import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { clubEventSchema } from "@/server/validators/clubEvent";
import { createClubEvent, listClubEvents } from "@/server/services/clubEvent.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "club_events:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ events: [] });
    const events = await listClubEvents(clubId);
    return jsonOk({ events });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "club_events:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = clubEventSchema.parse(body);
    const event = await createClubEvent(clubId, data);
    return jsonOk({ event }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
