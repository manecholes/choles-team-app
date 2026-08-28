import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { uploadDocumentSchema } from "@/server/validators/document";
import { uploadPlayerDocument } from "@/server/services/document.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "documents:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = uploadDocumentSchema.parse(body);
    const document = await uploadPlayerDocument(clubId, Number(params.id), user.userId, data);
    return jsonOk({ document }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
