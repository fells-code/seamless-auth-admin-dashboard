/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export type EventRange = "1h" | "24h" | "7d" | "custom";

export type EventFilter = {
  type: string[];
  from?: string;
  to?: string;
  range: EventRange;
};

export const EVENT_RANGES: EventRange[] = ["1h", "24h", "7d", "custom"];

export function isEventRange(value: string | null): value is EventRange {
  return value !== null && EVENT_RANGES.includes(value as EventRange);
}

export function getActiveEventFilterCount(filters: EventFilter) {
  const hasActiveRange =
    filters.range !== "24h" || Boolean(filters.from) || Boolean(filters.to);

  return filters.type.length + (hasActiveRange ? 1 : 0);
}
