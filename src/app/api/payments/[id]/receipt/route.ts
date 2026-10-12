import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertAnyPermission, assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { sendReceiptWhatsApp } from "@/server/services/receipt-whatsapp.service";
import { ForbiddenError } from "@/lib/auth";
import { getGuardianChildrenIds } from "@/lib/scope";
import { getPaymentWithDetails } from "@/server/services/payment.service";
import { generateReceiptPdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertAnyPermission(user, ["payments:read", "payments:read_own", "receipts:read_own"]);
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const payment = await getPaymentWithDetails(clubId, Number(params.id));

    if (user.role === "GUARDIAN") {
      const childrenIds = await getGuardianChildrenIds(user.userId);
      if (!childrenIds.includes(payment.playerId)) {
        throw new ForbiddenError("Solo puedes descargar recibos de tus hijos");
      }
    }

    if (payment.status !== "PAID") {
      return NextResponse.json({ error: "Este pago aun no tiene recibo generado" }, { status: 404 });
    }

    const registeredBy = payment.registeredById
      ? await prisma.user.findUnique({ where: { id: payment.registeredById }, select: { email: true } })
      : null;

    const pdfBytes = await generateReceiptPdf({
      receiptNumber: payment.receiptNumber,
      clubName: payment.club.name,
      playerName: `${payment.player.firstName} ${payment.player.lastName}`,
      conceptName: payment.concept.name,
      amount: payment.amount,
      method: payment.method,
      paymentDate: payment.paymentDate,
      periodLabel: payment.periodLabel,
      registeredByEmail: registeredBy?.email ?? null,
    });

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-${payment.receiptNumber}.pdf"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Envia el recibo de este pago por WhatsApp al acudiente.
 * - Sin parametros: se usa justo despues de marcar un pago como PAGADO (nunca envia dos veces el mismo recibo).
 * - ?force=1: reenvio manual (boton "Reenviar por WhatsApp").
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const force = new URL(req.url).searchParams.get("force") === "1";
    const whatsapp = await sendReceiptWhatsApp(clubId, Number(params.id), { userId: user.userId, force });
    return jsonOk({ whatsapp });
  } catch (err) {
    return handleApiError(err);
  }
}
