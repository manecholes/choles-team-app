import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { deletePayment, updatePayment } from "@/server/services/payment.service";
import { sendPaymentReceiptWhatsApp } from "@/server/services/receipt-whatsapp.service";
import { paymentSchema } from "@/server/validators/payment";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = paymentSchema.parse(body);
    const before = await prisma.payment.findFirst({ where: { id: Number(params.id), clubId }, select: { status: true } });
    const payment = await updatePayment(clubId, Number(params.id), user.userId, data);

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "UPDATE", entity: "Payment", entityId: payment.id },
    });

    // Recien pagado (antes no lo estaba): se le envia el recibo al acudiente por WhatsApp.
    const whatsapp =
      payment.status === "PAID" && before?.status !== "PAID"
        ? await sendPaymentReceiptWhatsApp(clubId, payment.id)
        : null;

    return jsonOk({ payment, whatsapp });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await deletePayment(clubId, Number(params.id));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
