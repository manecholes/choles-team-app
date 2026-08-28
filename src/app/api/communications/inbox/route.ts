import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { listInboxMessages } from "@/server/services/communication.service";

/** Bandeja de comunicados recibidos por el usuario autenticado (padres, jugadores, etc). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const inbox = await listInboxMessages(user.userId);
    return jsonOk({ inbox });
  } catch (err) {
    return handleApiError(err);
  }
}
