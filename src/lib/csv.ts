import "server-only";

export interface CsvColumnDef {
  header: string;
  key: string;
}

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Genera un CSV (separado por comas, con BOM para que Excel detecte UTF-8 correctamente). */
export function buildCsvBuffer(columns: CsvColumnDef[], rows: Record<string, unknown>[]): Buffer {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(row[c.key])).join(","));
  const content = [header, ...lines].join("\n");
  return Buffer.from("﻿" + content, "utf-8");
}
