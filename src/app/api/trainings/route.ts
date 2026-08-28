import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsTeam, getCoachTeamIds } from "@/lib/scope";
import { trainingSessionSchema } from "@/server/validators/training";
import { createTrainingSession, listTrainingSessions } from "@/server/services/training.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["trainings:read", "trainings:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ trainings: [] });

    const { searchParams } = new URL(req.url);
    const requestedTeamId = searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined;

    let teamIds: number[] | undefined;
    if (user.role === "COACH") {
      const own = await getCoachTeamIds(user.userId);
      teamIds = requestedTeamId ? own.filter((id) => id === requestedTeamId) : own;
    }

    const trainings = await listTrainingSessions(clubId, {
      teamId: teamIds ? undefined : requestedTeamId,
      teamIds,
    });
    return jsonOk({ trainings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["trainings:write", "trainings:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = trainingSessionSchema.parse(body);
    await assertCoachOwnsTeam(user, data.teamId);
    const session = await createTrainingSession(clubId, user.userId, data);
    return jsonOk({ session }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
