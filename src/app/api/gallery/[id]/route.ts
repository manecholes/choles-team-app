import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { gallerySchema } from "@/server/validators/gallery";
import { deleteGalleryImage, updateGalleryImage } from "@/server/services/gallery.service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "gallery:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = gallerySchema.parse(body);
    const image = await updateGalleryImage(clubId, Number(params.id), data);
    return jsonOk({ image });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "gallery:delete");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    await deleteGalleryImage(clubId, Number(params.id));
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
