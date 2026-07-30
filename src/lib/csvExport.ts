/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

/**
 * Quote a field for RFC 4180.
 *
 * A leading =, +, -, or @ is prefixed with a single quote. Spreadsheet
 * applications treat those as formula introducers, so an exported user agent or
 * IP could otherwise execute when the file is opened.
 */
function escapeField(value: string | number | boolean | null | undefined) {
  // Quoted even when empty, so every field in the file is quoted uniformly
  // rather than a missing value producing a bare gap between commas.
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const header = columns.map((column) => escapeField(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeField(column.value(row))).join(","),
  );

  return [header, ...body].join("\r\n");
}

/** Hand the browser a generated CSV as a download. */
export function downloadCsv(filename: string, contents: string) {
  // Leading BOM so Excel reads the file as UTF-8 rather than the local
  // codepage, which otherwise mangles non-ASCII user agents.
  const blob = new Blob([`\uFEFF${contents}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
) {
  downloadCsv(filename, toCsv(rows, columns));
}
