import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { categorySchema } from "@/server/validators/team";
import { createCategory, listCategories } from "@/server/services/category.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "categories:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ categories: [] });
    const categories = await listCategories(clubId);
    return jsonOk({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "categories:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = categorySchema.parse(body);
    const category = await createCategory(clubId, data);
    return jsonOk({ category }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
