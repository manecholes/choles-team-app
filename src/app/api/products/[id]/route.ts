import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { productSchema } from "@/server/validators/product";
import { deleteProduct, updateProduct } from "@/server/services/product.service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "products:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = productSchema.parse(body);
    const product = await updateProduct(clubId, Number(params.id), data);
    return jsonOk({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "products:delete");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await deleteProduct(clubId, Number(params.id));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
