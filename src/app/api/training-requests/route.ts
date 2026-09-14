import { NextRequest } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { getActingIdentity, getCoachTeamIds, getGuardianChildrenIds } from "@/lib/scope";
import { trainingRequestSchema } from "@/server/validators/trainingRequest";
import {
  createTrainingRequest,
  listTrainingRequestsForClub,
  listTrainingRequestsForPlayer,
  listTrainingRequestsForPlayers,
  listTrainingRequestsForTeams,
} from "@/server/services/trainingRequest.service";

/**
 * Lista solicitudes de entrenamiento individual, acotadas segun el rol
 * (punto 3): PLAYER ve solo las suyas, GUARDIAN las de sus hijos, COACH las
 * de los jugadores de sus equipos, y ADMIN/SUPER_ADMIN todas las del club.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["training_requests:read", "training_requests:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ trainingRequests: [] });

    if (user.role === "PLAYER") {
      const identity = await getActingIdentity(user.userId);
      if (!identity.playerId) return jsonOk({ trainingRequests: [] });
      const trainingRequests = await listTrainingRequestsForPlayer(clubId, identity.playerId);
      return jsonOk({ trainingRequests });
    }

    if (user.role === "GUARDIAN") {
      const playerIds = await getGuardianChildrenIds(user.userId);
      const trainingRequests = await listTrainingRequestsForPlayers(clubId, playerIds);
      return jsonOk({ trainingRequests });
    }

    if (user.role === "COACH") {
      const teamIds = await getCoachTeamIds(user.userId);
      const trainingRequests = await listTrainingRequestsForTeams(clubId, teamIds);
      return jsonOk({ trainingRequests });
    }

    // ADMIN / SUPER_ADMIN
    const trainingRequests = await listTrainingRequestsForClub(clubId);
    return jsonOk({ trainingRequests });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Crea una solicitud de entrenamiento individual. Solo el propio jugador puede crearla, para si mismo. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["training_requests:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const identity = await getActingIdentity(user.userId);
    if (!identity.playerId) {
      throw new ForbiddenError("Tu usuario no tiene un jugador vinculado");
    }

    const body = await req.json();
    const data = trainingRequestSchema.parse(body);
    const request = await createTrainingRequest(clubId, identity.playerId, data);
    return jsonOk({ request }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
