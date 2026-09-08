/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export function getRange(range: string, reference?: Date) {
  const now = reference ?? new Date();

  if (range === "1h") {
    return {
      from: new Date(now.getTime() - 1000 * 60 * 60),
      to: now,
    };
  }

  if (range === "24h") {
    return {
      from: new Date(now.getTime() - 1000 * 60 * 60 * 24),
      to: now,
    };
  }

  if (range === "7d") {
    return {
      from: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
      to: now,
    };
  }

  return null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Format a date for `<input type="datetime-local">`, which only accepts
 * `YYYY-MM-DDTHH:mm` in the viewer's local time. An ISO string with a trailing
 * `Z` is rejected outright and leaves the control blank.
 */
export function toDateTimeLocalValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Interpret a `datetime-local` value as a local wall-clock time, which is what
 * the control means, and return it as an absolute instant.
 */
export function fromDateTimeLocalValue(value?: string): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hours, minutes] = match.map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Resolve a filter into the absolute bounds sent to the API.
 *
 * Relative ranges are computed from a stable reference time rather than stored
 * in the URL, so the selected range always applies. Custom bounds are held in
 * `datetime-local` form for the inputs and converted to instants here.
 */
export function resolveRangeBounds(
  filter: { range: string; from?: string; to?: string },
  reference: number,
): { from?: string; to?: string } {
  if (filter.range === "custom") {
    return {
      from: fromDateTimeLocalValue(filter.from)?.toISOString(),
      to: fromDateTimeLocalValue(filter.to)?.toISOString(),
    };
  }

  const bounds = getRange(filter.range, new Date(reference));

  return bounds
    ? { from: bounds.from.toISOString(), to: bounds.to.toISOString() }
    : {};
}

export type TimeRange = "1h" | "24h" | "7d" | "custom";

export type RangeFilterValue = {
  range: TimeRange;
  from?: string;
  to?: string;
};

export const TIME_RANGES: TimeRange[] = ["1h", "24h", "7d", "custom"];

export const DEFAULT_TIME_RANGE: TimeRange = "24h";

export function isTimeRange(value: string | null): value is TimeRange {
  return value !== null && TIME_RANGES.includes(value as TimeRange);
}

/**
 * Read a range out of a URL query string.
 *
 * The chosen range is carried explicitly rather than inferred from the bounds,
 * so a relative selection survives a reload and stays highlighted.
 */
export function getRangeFromSearch(
  search: string,
  fallback: TimeRange = DEFAULT_TIME_RANGE,
): RangeFilterValue {
  const params = new URLSearchParams(search);
  const range = params.get("range");

  return {
    range: isTimeRange(range) ? range : fallback,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  };
}

/**
 * Write a range into query params, leaving anything else in them untouched.
 *
 * Only a custom range carries explicit bounds. Relative ranges are recomputed
 * on load so they always mean what they say.
 */
export function applyRangeToParams(
  params: URLSearchParams,
  value: RangeFilterValue,
): URLSearchParams {
  params.set("range", value.range);
  params.delete("from");
  params.delete("to");

  if (value.range === "custom") {
    if (value.from) params.set("from", value.from);
    if (value.to) params.set("to", value.to);
  }

  return params;
}

// The metrics endpoints bucket by hour or by day. Hourly buckets over a week
// are 168 points of noise on a chart sized for a day, so a window wider than
// two days switches to daily.
const DAILY_INTERVAL_THRESHOLD_MS = 1000 * 60 * 60 * 48;

export function intervalForRange(
  filter: RangeFilterValue,
  reference: number,
): "hour" | "day" {
  const bounds = resolveRangeBounds(filter, reference);

  if (!bounds.from || !bounds.to) return "hour";

  const span = new Date(bounds.to).getTime() - new Date(bounds.from).getTime();

  return span > DAILY_INTERVAL_THRESHOLD_MS ? "day" : "hour";
}

/** Names the selected window for UI copy, so a figure can say what it covers. */
export function describeRange(filter: RangeFilterValue): string {
  if (filter.range === "1h") return "the last hour";
  if (filter.range === "24h") return "the last 24 hours";
  if (filter.range === "7d") return "the last 7 days";

  return "the selected window";
}
