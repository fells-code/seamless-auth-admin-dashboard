/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { formatBytes } from "./formatBytes";

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1536)).toBe("1.50 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.50 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1024 ** 3 * 2)).toBe("2.00 GB");
  });

  it("keeps a unit for sizes above the gigabyte range", () => {
    // Previously the exponent ran past the unit list and rendered "undefined".
    expect(formatBytes(1024 ** 4 * 3)).toBe("3.00 TB");
    expect(formatBytes(1024 ** 5 * 1.5)).toBe("1.50 PB");
  });

  it("stays in the largest unit beyond the table rather than losing it", () => {
    expect(formatBytes(1024 ** 6)).toBe("1024.00 PB");
  });

  it("reports a realistic database size", () => {
    expect(formatBytes(1.2e12)).toBe("1.09 TB");
  });

  it("does not fall below the byte unit for fractional sizes", () => {
    // A negative exponent used to index before the start of the unit list.
    expect(formatBytes(0.5)).toBe("0.50 B");
    expect(formatBytes(1)).toBe("1.00 B");
  });

  it("treats invalid input as zero instead of rendering NaN", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
  });
});
