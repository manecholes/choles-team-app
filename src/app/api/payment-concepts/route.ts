import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { paymentConceptSchema } from "@/server/validators/payment";
import { createPaymentConcept, listPaymentConcepts } from "@/server/services/payment.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ concepts: [] });
    const concepts = await listPaymentConcepts(clubId);
    return jsonOk({ concepts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "payments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = paymentConceptSchema.parse(body);
    const concept = await createPaymentConcept(clubId, data);
    return jsonOk({ concept }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
