import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { markPaidSchema } from "@/server/validators/payment";
import { markPaymentPaid } from "@/server/services/payment.service";
import { sendPaymentReceiptWhatsApp } from "@/server/services/receipt-whatsapp.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = markPaidSchema.parse(body);
    const payment = await markPaymentPaid(clubId, Number(params.id), user.userId, data);

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "MARK_PAID", entity: "Payment", entityId: payment.id },
    });

    // Recibo al acudiente por WhatsApp (no se duplica si ya se habia enviado).
    const whatsapp = await sendPaymentReceiptWhatsApp(clubId, payment.id);

    return jsonOk({ payment, whatsapp });
  } catch (err) {
    return handleApiError(err);
  }
}
