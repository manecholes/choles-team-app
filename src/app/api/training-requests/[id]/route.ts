import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsPlayer } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { trainingRequestReviewSchema } from "@/server/validators/trainingRequest";
import { reviewTrainingRequest } from "@/server/services/trainingRequest.service";

/**
 * Aprueba o rechaza una solicitud de entrenamiento individual. Un COACH solo
 * puede revisar solicitudes de jugadores de sus propios equipos; ADMIN y
 * SUPER_ADMIN pueden revisar cualquiera del club (punto 3).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["training_requests:review", "training_requests:review_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const existing = await prisma.trainingRequest.findFirstOrThrow({ where: { id: Number(params.id), clubId } });
    await assertCoachOwnsPlayer(user, existing.playerId);

    const body = await req.json();
    const data = trainingRequestReviewSchema.parse(body);
    const request = await reviewTrainingRequest(clubId, Number(params.id), user.userId, data);
    return jsonOk({ request });
  } catch (err) {
    return handleApiError(err);
  }
}
