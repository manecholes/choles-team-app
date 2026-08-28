import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ForbiddenError } from "@/lib/auth";
import { handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { getGuardianChildrenIds } from "@/lib/scope";
import { getChildSummary } from "@/server/services/guardian.service";

/** Resumen "Mi Hijo" (punto 29) para el padre/tutor autenticado. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    if (user.role !== "GUARDIAN") throw new ForbiddenError("Solo disponible para padres/tutores");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const playerId = Number(params.id);
    const childrenIds = await getGuardianChildrenIds(user.userId);
    if (!childrenIds.includes(playerId)) {
      throw new ForbiddenError("Solo puedes consultar la informacion de tus hijos");
    }

    const summary = await getChildSummary(clubId, playerId);
    return jsonOk({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}
