import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsPlayer } from "@/lib/scope";
import { loadEntrySchema } from "@/server/validators/evaluation";
import { createLoadEntry } from "@/server/services/evaluation.service";

/** Registro rapido de RPE + duracion (carga interna, punto 15). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["evaluations:write", "evaluations:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = loadEntrySchema.parse(body);

    await assertCoachOwnsPlayer(user, data.playerId);

    const entry = await createLoadEntry(clubId, data);
    return jsonOk({ entry }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
