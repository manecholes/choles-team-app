import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
      include: { club: true },
    });
    const { passwordHash: _omit, ...safeUser } = user;
    return jsonOk({ user: safeUser });
  } catch (err) {
    return handleApiError(err);
  }
}
