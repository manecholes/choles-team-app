import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { categorySchema } from "@/server/validators/team";
import { deleteCategory, updateCategory } from "@/server/services/category.service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "categories:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = categorySchema.parse(body);
    const category = await updateCategory(clubId, Number(params.id), data);
    return jsonOk({ category });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "categories:delete");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await deleteCategory(clubId, Number(params.id));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
