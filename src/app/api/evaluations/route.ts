import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { assertCoachOwnsPlayer, getCoachTeamIds } from "@/lib/scope";
import { evaluationSchema } from "@/server/validators/evaluation";
import { createEvaluation, listEvaluations } from "@/server/services/evaluation.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["evaluations:read", "evaluations:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ evaluations: [] });

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId") ? Number(searchParams.get("playerId")) : undefined;

    if (playerId) {
      await assertCoachOwnsPlayer(user, playerId);
      const evaluations = await listEvaluations(clubId, { playerId });
      return jsonOk({ evaluations });
    }

    if (user.role === "COACH") {
      const teamIds = await getCoachTeamIds(user.userId);
      const players = await prisma.teamPlayer.findMany({
        where: { teamId: { in: teamIds }, leftAt: null },
        select: { playerId: true },
        distinct: ["playerId"],
      });
      const allowedIds = players.map((p) => p.playerId);
      const evaluations = await prisma.evaluation.findMany({
        where: { clubId, playerId: { in: allowedIds } },
        include: { tests: true, player: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { date: "desc" },
      });
      return jsonOk({ evaluations });
    }

    const evaluations = await listEvaluations(clubId);
    return jsonOk({ evaluations });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["evaluations:write", "evaluations:write_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = evaluationSchema.parse(body);

    await assertCoachOwnsPlayer(user, data.playerId);

    const evaluation = await createEvaluation(clubId, user.userId, data);

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "CREATE", entity: "Evaluation", entityId: evaluation.id },
    });

    return jsonOk({ evaluation }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
