import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ForbiddenError } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsPlayer, getActingIdentity, getGuardianChildrenIds } from "@/lib/scope";
import { getPerformanceProfile } from "@/server/services/evaluation.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["evaluations:read", "evaluations:read_own", "evaluations:read_own_authorized"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const playerId = Number(params.id);

    if (user.role === "COACH") {
      await assertCoachOwnsPlayer(user, playerId);
    } else if (user.role === "GUARDIAN") {
      const childrenIds = await getGuardianChildrenIds(user.userId);
      if (!childrenIds.includes(playerId)) {
        throw new ForbiddenError("Solo puedes consultar el rendimiento de tus hijos");
      }
      const link = await prisma.playerGuardian.findFirst({
        where: { playerId, guardian: { user: { id: user.userId } } },
      });
      if (!link?.canViewEvaluations) {
        throw new ForbiddenError("No tienes autorizacion para ver las evaluaciones de este jugador");
      }
    } else if (user.role === "PLAYER") {
      const identity = await getActingIdentity(user.userId);
      if (identity.playerId !== playerId) {
        throw new ForbiddenError("Solo puedes consultar tu propio rendimiento");
      }
    }

    const profile = await getPerformanceProfile(clubId, playerId);
    return jsonOk({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
