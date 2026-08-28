import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk } from "@/lib/api-utils";
import { createAdminSchema } from "@/server/validators/settings";
import { createClubAdmin } from "@/server/services/settings.service";

/** Crea el usuario ADMIN inicial de un club (punto 3: SUPER_ADMIN crea administradores). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "clubs:write");
    const body = await req.json();
    const data = createAdminSchema.parse(body);
    const admin = await createClubAdmin(data);
    return jsonOk({ admin }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
