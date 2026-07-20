/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fromDateTimeLocalValue,
  getRange,
  resolveRangeBounds,
  toDateTimeLocalValue,
} from "./timeRange";

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

describe("toDateTimeLocalValue", () => {
  it("formats a date for a datetime-local input", () => {
    // Built from local parts so the expectation holds in any timezone.
    const date = new Date(2026, 6, 19, 14, 5);

    expect(toDateTimeLocalValue(date)).toBe("2026-07-19T14:05");
  });
});

describe("fromDateTimeLocalValue", () => {
  it("reads the value as local wall-clock time", () => {
    const parsed = fromDateTimeLocalValue("2026-07-19T14:05");

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(19);
    expect(parsed?.getHours()).toBe(14);
    expect(parsed?.getMinutes()).toBe(5);
  });

  it("round-trips with toDateTimeLocalValue", () => {
    const value = "2026-01-02T03:04";

    expect(toDateTimeLocalValue(fromDateTimeLocalValue(value)!)).toBe(value);
  });

  it("rejects an ISO string, which a datetime-local input cannot display", () => {
    expect(fromDateTimeLocalValue("2026-07-19T14:05:00.000Z")).toBeNull();
  });

  it("returns null for missing or malformed values", () => {
    expect(fromDateTimeLocalValue(undefined)).toBeNull();
    expect(fromDateTimeLocalValue("")).toBeNull();
    expect(fromDateTimeLocalValue("not-a-date")).toBeNull();
  });
});

describe("resolveRangeBounds", () => {
  const reference = new Date(2026, 6, 19, 12, 0).getTime();

  it("applies concrete bounds for a relative range", () => {
    const bounds = resolveRangeBounds({ range: "24h" }, reference);

    expect(bounds.from).toBeDefined();
    expect(bounds.to).toBeDefined();
    expect(
      new Date(bounds.to!).getTime() - new Date(bounds.from!).getTime(),
    ).toBe(1000 * 60 * 60 * 24);
  });

  it("ignores stale bounds carried alongside a relative range", () => {
    const bounds = resolveRangeBounds(
      { range: "1h", from: "1999-01-01T00:00", to: "1999-01-02T00:00" },
      reference,
    );

    expect(
      new Date(bounds.to!).getTime() - new Date(bounds.from!).getTime(),
    ).toBe(1000 * 60 * 60);
  });

  it("converts custom local bounds into absolute instants", () => {
    const bounds = resolveRangeBounds(
      { range: "custom", from: "2026-07-19T09:00", to: "2026-07-19T17:00" },
      reference,
    );

    expect(bounds.from).toBe(new Date(2026, 6, 19, 9, 0).toISOString());
    expect(bounds.to).toBe(new Date(2026, 6, 19, 17, 0).toISOString());
  });

  it("omits custom bounds that are not set", () => {
    expect(resolveRangeBounds({ range: "custom" }, reference)).toEqual({
      from: undefined,
      to: undefined,
    });
  });
});
