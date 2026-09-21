import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { clubEventSchema } from "@/server/validators/clubEvent";
import { deleteClubEvent, updateClubEvent } from "@/server/services/clubEvent.service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "club_events:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = clubEventSchema.parse(body);
    const event = await updateClubEvent(clubId, Number(params.id), data);
    return jsonOk({ event });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "club_events:delete");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await deleteClubEvent(clubId, Number(params.id));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
