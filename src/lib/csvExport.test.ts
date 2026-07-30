/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { toCsv } from "./csvExport";

type Row = { name: string; count: number; note: string | null };

const columns = [
  { header: "Name", value: (row: Row) => row.name },
  { header: "Count", value: (row: Row) => row.count },
  { header: "Note", value: (row: Row) => row.note },
];

describe("toCsv", () => {
  it("writes a header row and quotes every field", () => {
    const csv = toCsv([{ name: "ada", count: 2, note: null }], columns);

    expect(csv).toBe('"Name","Count","Note"\r\n"ada","2",""');
  });

  it("escapes embedded quotes, commas, and newlines", () => {
    const csv = toCsv(
      [{ name: 'a "quoted", value', count: 1, note: "two\nlines" }],
      columns,
    );

    expect(csv).toContain('"a ""quoted"", value"');
    expect(csv).toContain('"two\nlines"');
  });

  it("neutralises fields a spreadsheet would treat as a formula", () => {
    const csv = toCsv([{ name: "=1+1", count: 0, note: "@SUM(A1)" }], columns);

    // Without the leading apostrophe these execute when the file is opened.
    expect(csv).toContain(`"'=1+1"`);
    expect(csv).toContain(`"'@SUM(A1)"`);
  });
});
