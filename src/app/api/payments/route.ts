import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { getDelegateTeamIds, getGuardianChildrenIds } from "@/lib/scope";
import { paymentSchema } from "@/server/validators/payment";
import { createPayment, listPayments } from "@/server/services/payment.service";
import { ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["payments:read", "payments:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ payments: [] });

    const { searchParams } = new URL(req.url);
    const requestedPlayerId = searchParams.get("playerId") ? Number(searchParams.get("playerId")) : undefined;
    const requestedTeamId = searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined;

    let playerId = requestedPlayerId;
    let teamId = requestedTeamId;

    if (user.role === "GUARDIAN") {
      const childrenIds = await getGuardianChildrenIds(user.userId);
      if (requestedPlayerId && !childrenIds.includes(requestedPlayerId)) {
        throw new ForbiddenError("Solo puedes consultar los pagos de tus hijos");
      }
      if (!requestedPlayerId) {
        // Sin jugador especifico: se filtra por todos sus hijos consultando uno por uno no es ideal,
        // asi que se resuelve con un OR directo en la consulta.
        const payments = await prisma.payment.findMany({
          where: { clubId, playerId: { in: childrenIds } },
          include: { player: { select: { id: true, firstName: true, lastName: true } }, concept: true, receipt: true },
          orderBy: { createdAt: "desc" },
        });
        return jsonOk({ payments });
      }
      playerId = requestedPlayerId;
    } else if (user.role === "DELEGATE") {
      const teamIds = await getDelegateTeamIds(user.userId);
      if (requestedTeamId && !teamIds.includes(requestedTeamId)) {
        throw new ForbiddenError("Solo puedes consultar pagos de tu propio equipo");
      }
      teamId = requestedTeamId ?? teamIds[0];
    }

    const payments = await listPayments(clubId, {
      playerId,
      teamId,
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
      status: searchParams.get("status") ?? undefined,
      conceptId: searchParams.get("conceptId") ? Number(searchParams.get("conceptId")) : undefined,
    });
    return jsonOk({ payments });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["payments:write"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = paymentSchema.parse(body);
    const payment = await createPayment(clubId, user.userId, data);

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "CREATE", entity: "Payment", entityId: payment.id },
    });

    return jsonOk({ payment }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
