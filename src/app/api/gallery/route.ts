import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk, resolveClubScope } from "@/lib/api-utils";
import { gallerySchema } from "@/server/validators/gallery";
import { createGalleryImage, listGalleryImages } from "@/server/services/gallery.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "gallery:read");
    const clubId = resolveClubScope(user);
    if (!clubId) return jsonOk({ images: [] });
    const images = await listGalleryImages(clubId);
    return jsonOk({ images });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "gallery:write");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");
    const body = await req.json();
    const data = gallerySchema.parse(body);
    const image = await createGalleryImage(clubId, data);
    return jsonOk({ image }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
