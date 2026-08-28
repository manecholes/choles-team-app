import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPermission, handleApiError, resolveClubScope } from "@/lib/api-utils";
import { getReportData, type ReportType } from "@/server/services/report.service";
import { buildExcelBuffer } from "@/lib/excel";
import { buildCsvBuffer } from "@/lib/csv";
import { generateTablePdf } from "@/lib/pdf";

const VALID_TYPES: ReportType[] = [
  "players",
  "players-by-category",
  "attendance",
  "revenue",
  "payments",
  "statistics",
  "evaluations",
  "matches",
  "tournaments",
];

/**
 * Modulo de reportes (punto 18). Un solo endpoint parametrizado por tipo de
 * reporte y formato de salida (json para previsualizar en la pagina, o
 * pdf/xlsx/csv para exportar). "format=json" solo requiere "reports:read";
 * exportar requiere ademas "reports:export".
 */
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const user = await requireUser(req);
    assertPermission(user, "reports:read");
    const clubId = resolveClubScope(user);
    if (!clubId) throw new Error("Club no resuelto");

    const type = params.type as ReportType;
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Tipo de reporte invalido" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "json";
    const filters = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
      teamId: searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined,
    };

    const data = await getReportData(clubId, type, filters);

    if (format === "json") {
      return NextResponse.json(data);
    }

    assertPermission(user, "reports:export");

    if (format === "csv") {
      const buffer = buildCsvBuffer(
        data.columns.map((c) => ({ header: c.header, key: c.key })),
        data.rows
      );
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const buffer = await buildExcelBuffer(data.title, data.columns, data.rows);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${type}.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      const bytes = await generateTablePdf(data.title, data.columns, data.rows);
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${type}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Formato invalido" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
