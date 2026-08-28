import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, jsonOk } from "@/lib/api-utils";
import { clubSchema } from "@/server/validators/settings";
import { updateClub } from "@/server/services/settings.service";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "clubs:write");
    const body = await req.json();
    const data = clubSchema.partial().parse(body);
    const club = await updateClub(Number(params.id), data);
    return jsonOk({ club });
  } catch (err) {
    return handleApiError(err);
  }
}
