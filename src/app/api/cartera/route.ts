import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { getCartera } from "@/server/services/payment.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "cartera:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ rows: [], totals: { totalDebt: 0, players: 0 } });

    const { searchParams } = new URL(req.url);
    const result = await getCartera(clubId, {
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
      teamId: searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined,
      month: searchParams.get("month") ?? undefined,
      status: (searchParams.get("status") as "PENDING" | "OVERDUE") || undefined,
    });
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
