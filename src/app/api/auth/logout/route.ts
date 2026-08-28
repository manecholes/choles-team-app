import { NextRequest } from "next/server";
import { revokeRefreshToken } from "@/server/services/auth.service";
import { clearSessionCookies, getRefreshTokenFromCookies } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function POST(_req: NextRequest) {
  try {
    const token = await getRefreshTokenFromCookies();
    if (token) {
      await revokeRefreshToken(token);
    }
    await clearSessionCookies();
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
