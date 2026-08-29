import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { createAccessSchema, resetPasswordSchema } from "@/server/validators/auth";
import { createGuardianUserAccess, resetGuardianPassword } from "@/server/services/guardian.service";

/** Crea el login (correo/contrasena) de un padre/tutor ya registrado. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "guardians:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = createAccessSchema.parse(body);
    const created = await createGuardianUserAccess(clubId, Number(params.id), data.email, data.password);
    return jsonOk({ user: created }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** Restablece la contrasena de un padre/tutor que ya tiene acceso creado. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "guardians:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = resetPasswordSchema.parse(body);
    const updated = await resetGuardianPassword(clubId, Number(params.id), data.password);
    return jsonOk({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
