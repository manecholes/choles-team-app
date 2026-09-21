import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { productSchema } from "@/server/validators/product";
import { createProduct, listProducts } from "@/server/services/product.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "products:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ products: [] });
    const products = await listProducts(clubId);
    return jsonOk({ products });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "products:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = productSchema.parse(body);
    const product = await createProduct(clubId, data);
    return jsonOk({ product }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
