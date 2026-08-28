import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk } from "@/lib/api-utils";
import { clubSchema } from "@/server/validators/settings";
import { createClub, listClubs } from "@/server/services/settings.service";

/** Gestion de clubes (punto 23: multi-club). Solo SUPER_ADMIN tiene el permiso comodin "*" que habilita esto. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "clubs:read");
    const clubs = await listClubs();
    return jsonOk({ clubs });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "clubs:write");
    const body = await req.json();
    const data = clubSchema.parse(body);
    const club = await createClub(data);
    return jsonOk({ club }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
