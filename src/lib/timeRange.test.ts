/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { getRange } from "./timeRange";

describe("getRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a one hour range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

    const range = getRange("1h");

    expect(range?.to.toISOString()).toBe("2026-04-21T12:00:00.000Z");
    expect(range?.from.toISOString()).toBe("2026-04-21T11:00:00.000Z");
  });

  it("returns a seven day range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

    const range = getRange("7d");

    expect(range?.to.toISOString()).toBe("2026-04-21T12:00:00.000Z");
    expect(range?.from.toISOString()).toBe("2026-04-14T12:00:00.000Z");
  });

  it("returns null for unknown ranges", () => {
    expect(getRange("custom")).toBeNull();
  });
});
