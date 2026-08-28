import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { generateFixtureSchema } from "@/server/validators/tournament";
import { generateFixture } from "@/server/services/tournament.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "tournaments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = generateFixtureSchema.parse(body);
    const result = await generateFixture(clubId, Number(params.id), user.userId, data);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
