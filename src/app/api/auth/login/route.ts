import { NextRequest } from "next/server";
import { loginSchema } from "@/server/validators/auth";
import { authenticate } from "@/server/services/auth.service";
import { setSessionCookies } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const { accessToken, refreshToken, user } = await authenticate(email, password);
    await setSessionCookies(accessToken, refreshToken);

    await prisma.auditLog.create({
      data: {
        clubId: user.clubId,
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
      },
    });

    return jsonOk({
      accessToken, // se incluye tambien en el body para clientes moviles/no-cookie
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
        mustChangePassword: user.mustChangePassword,
        club: user.club ? { id: user.club.id, name: user.club.name, slug: user.club.slug } : null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
