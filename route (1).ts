import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { createAccessSchema } from "@/server/validators/auth";
import { createDelegateUserAccess } from "@/server/services/staff.service";

/** Crea el login (correo/contrasena) de un delegado ya registrado. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "delegates:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = createAccessSchema.parse(body);
    const created = await createDelegateUserAccess(clubId, Number(params.id), data.email, data.password);
    return jsonOk({ user: created }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
