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
