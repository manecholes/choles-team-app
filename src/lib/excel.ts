import "server-only";
import ExcelJS from "exceljs";

export interface ExcelColumnDef {
  header: string;
  key: string;
  width?: number;
}

/** Genera un archivo .xlsx en memoria a partir de columnas + filas (usado por Cartera y Reportes). */
export async function buildExcelBuffer(
  sheetName: string,
  columns: ExcelColumnDef[],
  rows: Record<string, unknown>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Choles Team App";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123852" } };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
