import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { listNotifications, markAllNotificationsRead } from "@/server/services/communication.service";

/** Notificaciones del usuario autenticado. No requieren un permiso de modulo: cada usuario solo ve las suyas. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const notifications = await listNotifications(user.userId);
    return jsonOk({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await markAllNotificationsRead(user.userId);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
