import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { settingSchema } from "@/server/validators/settings";
import { listSettings, upsertSetting } from "@/server/services/settings.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "settings:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ settings: [] });
    const settings = await listSettings(clubId);
    return jsonOk({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "settings:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = settingSchema.parse(body);
    const setting = await upsertSetting(clubId, data);
    return jsonOk({ setting });
  } catch (err) {
    return handleApiError(err);
  }
}
