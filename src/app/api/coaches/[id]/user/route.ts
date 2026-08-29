import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { createAccessSchema, resetPasswordSchema } from "@/server/validators/auth";
import { createCoachUserAccess, resetCoachPassword } from "@/server/services/staff.service";

/** Crea el login (correo/contrasena) de un entrenador ya registrado. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "coaches:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = createAccessSchema.parse(body);
    const created = await createCoachUserAccess(clubId, Number(params.id), data.email, data.password);
    return jsonOk({ user: created }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** Restablece la contrasena de un entrenador que ya tiene acceso creado. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "coaches:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = resetPasswordSchema.parse(body);
    const updated = await resetCoachPassword(clubId, Number(params.id), data.password);
    return jsonOk({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
