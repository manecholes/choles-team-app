import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { communicationSchema } from "@/server/validators/communication";
import { createMessage, listMessages } from "@/server/services/communication.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "communications:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ messages: [] });
    const messages = await listMessages(clubId);
    return jsonOk({ messages });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "communications:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = communicationSchema.parse(body);
    const result = await createMessage(clubId, user.userId, data);

    await prisma.auditLog.create({
      data: { clubId, userId: user.userId, action: "CREATE", entity: "Message", entityId: result.message.id },
    });

    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
