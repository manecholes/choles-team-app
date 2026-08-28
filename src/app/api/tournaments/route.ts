import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { tournamentSchema } from "@/server/validators/tournament";
import { createTournament, listTournaments } from "@/server/services/tournament.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "tournaments:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ tournaments: [] });
    const tournaments = await listTournaments(clubId);
    return jsonOk({ tournaments });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "tournaments:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = tournamentSchema.parse(body);
    const tournament = await createTournament(clubId, data);
    return jsonOk({ tournament }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
