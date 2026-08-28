import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { changePasswordSchema } from "@/server/validators/auth";
import { changePassword } from "@/server/services/auth.service";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    const body = await req.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);
    await changePassword(auth.userId, currentPassword, newPassword);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
