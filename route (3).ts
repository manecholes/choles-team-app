import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { sendPaymentReceiptWhatsApp } from "@/server/services/receipt-whatsapp.service";

/**
 * Reenvia a mano el recibo de un pago ya PAGADO al WhatsApp del acudiente
 * (por ejemplo si el primer envio fallo o la familia lo borro).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const whatsapp = await sendPaymentReceiptWhatsApp(clubId, Number(params.id), { force: true });
    return jsonOk({ whatsapp });
  } catch (err) {
    return handleApiError(err);
  }
}
