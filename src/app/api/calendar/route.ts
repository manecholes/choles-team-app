import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { calendarEventSchema } from "@/server/validators/calendar";
import { createEvent, listEvents } from "@/server/services/calendar.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "calendar:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ events: [] });
    const { searchParams } = new URL(req.url);
    const events = await listEvents(clubId, {
      start: searchParams.get("start") ? new Date(searchParams.get("start")!) : undefined,
      end: searchParams.get("end") ? new Date(searchParams.get("end")!) : undefined,
      teamId: searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined,
      type: searchParams.get("type") ?? undefined,
    });
    return jsonOk({ events });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "calendar:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = calendarEventSchema.parse(body);
    const events = await createEvent(clubId, user.userId, data);
    return jsonOk({ events }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
