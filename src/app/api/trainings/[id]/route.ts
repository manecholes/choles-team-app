import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsTeam } from "@/lib/scope";
import { trainingSessionSchema } from "@/server/validators/training";
import {
  deleteTrainingSession,
  getTrainingSessionForAttendance,
  updateTrainingSession,
} from "@/server/services/training.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["trainings:read", "trainings:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const detail = await getTrainingSessionForAttendance(clubId, Number(params.id));
    return jsonOk(detail);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["trainings:write", "trainings:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = trainingSessionSchema.parse(body);
    await assertCoachOwnsTeam(user, data.teamId);
    const session = await updateTrainingSession(clubId, Number(params.id), data);
    return jsonOk({ session });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["trainings:write", "trainings:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const existing = await prisma.trainingSession.findFirstOrThrow({ where: { id: Number(params.id), clubId } });
    await assertCoachOwnsTeam(user, existing.teamId);
    await deleteTrainingSession(clubId, Number(params.id));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
