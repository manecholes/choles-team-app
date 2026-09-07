import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { generateMonthlyChargesSchema } from "@/server/validators/payment";
import { generateMonthlyCharges } from "@/server/services/payment.service";
import { prisma } from "@/lib/prisma";

/**
 * Genera el cargo de mensualidad del mes para todos los jugadores activos
 * que todavia no lo tengan. Se llama sola al entrar al modulo de Pagos (ver
 * pagos/page.tsx) para que el club no tenga que crear un pago por jugador a
 * mano cada mes; es segura de llamar varias veces, nunca duplica cargos.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json().catch(() => ({}));
    const data = generateMonthlyChargesSchema.parse(body);
    const result = await generateMonthlyCharges(clubId, user.userId, data);

    if (result.created > 0) {
      await prisma.auditLog.create({
        data: { clubId, userId: user.userId, action: "GENERATE_MONTHLY_CHARGES", entity: "Payment", entityId: result.concept.id },
      });
    }

    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
