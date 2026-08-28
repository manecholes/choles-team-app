import { NextRequest } from "next/server";
import { rotateRefreshToken } from "@/server/services/auth.service";
import { getRefreshTokenFromCookies, setSessionCookies } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { UnauthorizedError } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    const currentRefreshToken = await getRefreshTokenFromCookies();
    if (!currentRefreshToken) {
      throw new UnauthorizedError("No hay sesion activa");
    }
    const { accessToken, refreshToken } = await rotateRefreshToken(currentRefreshToken);
    await setSessionCookies(accessToken, refreshToken);
    return jsonOk({ accessToken });
  } catch (err) {
    return handleApiError(err);
  }
}
