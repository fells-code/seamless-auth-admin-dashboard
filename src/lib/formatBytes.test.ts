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
});
