import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsTeam } from "@/lib/scope";
import { attendanceBatchSchema } from "@/server/validators/training";
import { saveAttendanceBatch } from "@/server/services/training.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["attendance:write", "attendance:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const sessionId = Number(params.id);
    const existing = await prisma.trainingSession.findFirstOrThrow({ where: { id: sessionId, clubId } });
    await assertCoachOwnsTeam(user, existing.teamId);

    const body = await req.json();
    const data = attendanceBatchSchema.parse(body);
    const result = await saveAttendanceBatch(clubId, sessionId, data);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
