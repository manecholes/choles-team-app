import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { paymentConceptSchema } from "@/server/validators/payment";
import { updatePaymentConcept } from "@/server/services/payment.service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = paymentConceptSchema.parse(body);
    const concept = await updatePaymentConcept(clubId, Number(params.id), data);
    return jsonOk({ concept });
  } catch (err) {
    return handleApiError(err);
  }
}
