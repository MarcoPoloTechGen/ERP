import writeXlsxFile, { type SheetData } from "write-excel-file/browser";

type ExportRow = Record<string, string | number | null | undefined>;

function normalizeRows(rows: ExportRow[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, value == null ? "" : value]),
    ),
  );
}

function getHeaders(rows: ExportRow[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv(fileName: string, rows: ExportRow[]) {
  const normalizedRows = normalizeRows(rows);
  const headers = getHeaders(normalizedRows);
  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...normalizedRows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(",")),
  ].join("\r\n");

  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), fileName);
}

export async function exportRowsToExcel(fileName: string, sheetName: string, rows: ExportRow[]) {
  const normalizedRows = normalizeRows(rows);
  const headers = getHeaders(normalizedRows);
  const data: SheetData = [
    headers.map((header) => ({ value: header, fontWeight: "bold" })),
    ...normalizedRows.map((row) => headers.map((header) => row[header] ?? "")),
  ];

  await writeXlsxFile(data, {
    sheet: sheetName,
    columns: headers.map((header) => ({ width: Math.max(12, Math.min(header.length + 4, 32)) })),
  }).toFile(fileName);
}
