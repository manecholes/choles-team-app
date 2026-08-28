import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, resolveClubScope } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { getFileAbsolutePath } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "documents:read");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const document = await prisma.document.findFirstOrThrow({ where: { id: Number(params.id), clubId } });
    const buffer = await fs.readFile(getFileAbsolutePath(document.filePath));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
