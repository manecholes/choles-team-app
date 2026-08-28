import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, resolveClubScope } from "@/lib/api-utils";
import { getCartera } from "@/server/services/payment.service";
import { buildExcelBuffer } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "cartera:export");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const { searchParams } = new URL(req.url);
    const { rows } = await getCartera(clubId, {
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
      teamId: searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined,
      month: searchParams.get("month") ?? undefined,
      status: (searchParams.get("status") as "PENDING" | "OVERDUE") || undefined,
    });

    const buffer = await buildExcelBuffer(
      "Cartera",
      [
        { header: "Jugador", key: "playerName", width: 30 },
        { header: "Categoria", key: "category", width: 15 },
        { header: "Equipo", key: "team", width: 20 },
        { header: "Valor adeudado", key: "debt", width: 18 },
        { header: "Meses pendientes", key: "monthsPending", width: 16 },
        { header: "Ultimo pago", key: "lastPayment", width: 15 },
        { header: "Dias de mora", key: "maxDaysOverdue", width: 14 },
        { header: "Estado", key: "status", width: 14 },
      ],
      rows.map((r) => ({
        ...r,
        lastPayment: r.lastPayment ? new Date(r.lastPayment).toLocaleDateString("es-CO") : "-",
        status: r.status === "OVERDUE" ? "Vencido" : "Pendiente",
      }))
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="cartera-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
