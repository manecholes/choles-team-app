import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TURQUI = rgb(18 / 255, 56 / 255, 82 / 255);
const RED = rgb(214 / 255, 40 / 255, 40 / 255);
const GRAY = rgb(0.4, 0.4, 0.4);

export interface ReceiptData {
  receiptNumber: string;
  clubName: string;
  playerName: string;
  conceptName: string;
  amount: number;
  method: string | null;
  paymentDate: Date | null;
  periodLabel: string | null;
  registeredByEmail: string | null;
}

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

/** Genera el PDF del recibo de pago (punto 12: "generar automaticamente recibo PDF"). */
export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 560]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 510;
  const marginX = 40;

  page.drawRectangle({ x: 0, y: 520, width: 420, height: 40, color: TURQUI });
  page.drawText(data.clubName, { x: marginX, y: 535, size: 16, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Juntos, somos Choles Team.", { x: marginX, y: 522, size: 8, font, color: rgb(0.85, 0.9, 0.95) });

  y = 490;
  page.drawText("RECIBO DE PAGO", { x: marginX, y, size: 14, font: fontBold, color: TURQUI });
  y -= 10;
  page.drawText(`No. ${data.receiptNumber}`, { x: marginX, y: y - 10, size: 10, font, color: GRAY });

  y -= 40;
  const rows: Array<[string, string]> = [
    ["Jugador", data.playerName],
    ["Concepto", data.conceptName],
    ["Periodo", data.periodLabel ?? "-"],
    ["Valor", formatCOP(data.amount)],
    ["Metodo de pago", data.method ?? "-"],
    ["Fecha de pago", data.paymentDate ? data.paymentDate.toLocaleDateString("es-CO") : "-"],
    ["Registrado por", data.registeredByEmail ?? "-"],
  ];

  for (const [label, value] of rows) {
    page.drawText(`${label}:`, { x: marginX, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: marginX + 130, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 22;
  }

  y -= 10;
  page.drawLine({ start: { x: marginX, y }, end: { x: 380, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;

  page.drawText("Este recibo confirma el pago recibido por Choles Team.", { x: marginX, y, size: 9, font, color: GRAY });
  y -= 14;
  page.drawText("Documento generado automaticamente por Choles Team App.", { x: marginX, y, size: 8, font, color: GRAY });

  page.drawRectangle({ x: 0, y: 0, width: 420, height: 6, color: RED });

  return doc.save();
}

export interface TablePdfColumn {
  header: string;
  key: string;
  width?: number;
}

/** Genera un PDF tabular generico (punto 18: reportes en PDF). Pagina el contenido automaticamente. */
export async function generateTablePdf(
  title: string,
  columns: TablePdfColumn[],
  rows: Record<string, unknown>[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 780;
  const pageHeight = 560;
  const marginX = 30;
  const rowHeight = 18;
  const totalColWidth = pageWidth - marginX * 2;
  const defaultWidth = totalColWidth / columns.length;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 40;

  function drawHeaderBar(p: typeof page) {
    p.drawRectangle({ x: 0, y: pageHeight - 34, width: pageWidth, height: 34, color: TURQUI });
    p.drawText("Choles Team", { x: marginX, y: pageHeight - 22, size: 13, font: fontBold, color: rgb(1, 1, 1) });
    p.drawText(title, { x: marginX, y: pageHeight - 22, size: 11, font, color: rgb(1, 1, 1) });
  }

  function drawTableHeader() {
    let x = marginX;
    page.drawRectangle({ x: marginX, y: y - 4, width: totalColWidth, height: rowHeight, color: rgb(0.92, 0.94, 0.96) });
    for (const col of columns) {
      const w = col.width ?? defaultWidth;
      page.drawText(col.header, { x: x + 3, y: y, size: 8.5, font: fontBold, color: TURQUI });
      x += w;
    }
    y -= rowHeight;
  }

  drawHeaderBar(page);
  y -= 50;
  page.drawText(`Generado: ${new Date().toLocaleString("es-CO")}`, { x: marginX, y, size: 8, font, color: GRAY });
  y -= 16;
  drawTableHeader();

  for (const row of rows) {
    if (y < 40) {
      page = doc.addPage([pageWidth, pageHeight]);
      drawHeaderBar(page);
      y = pageHeight - 90;
      drawTableHeader();
    }
    let x = marginX;
    for (const col of columns) {
      const w = col.width ?? defaultWidth;
      const raw = row[col.key];
      const text = raw === null || raw === undefined ? "-" : String(raw);
      page.drawText(text.slice(0, Math.floor(w / 4.5)), { x: x + 3, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      x += w;
    }
    y -= rowHeight;
  }

  if (rows.length === 0) {
    page.drawText("Sin datos para los filtros seleccionados.", { x: marginX, y, size: 9, font, color: GRAY });
  }

  return doc.save();
}
