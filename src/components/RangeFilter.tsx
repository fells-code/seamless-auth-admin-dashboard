/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useId } from "react";
import {
  getRange,
  toDateTimeLocalValue,
  TIME_RANGES,
  type RangeFilterValue,
  type TimeRange,
} from "../lib/timeRange";

const localTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local time";

const RANGE_LABELS: Record<TimeRange, string> = {
  "1h": "1h",
  "24h": "24h",
  "7d": "7d",
  custom: "Custom",
};

/**
 * The time-range half of the event filters, shared with the screens that only
 * need a window. Extracted so Overview and Security cannot drift into a second
 * range model with its own idea of what "7d" means.
 */
export default function RangeFilter({
  value,
  onChange,
  label = "Time range",
}: {
  value: RangeFilterValue;
  onChange: (v: RangeFilterValue) => void;
  label?: string;
}) {
  const rangeErrorId = useId();
  const rangeInverted = Boolean(
    value.from && value.to && new Date(value.from) > new Date(value.to),
  );

  const handleRangeChange = (next: TimeRange) => {
    if (next !== "custom") {
      // Relative ranges carry no bounds; they are resolved when the query runs
      // so the window is always current.
      onChange({ ...value, range: next, from: undefined, to: undefined });
      return;
    }

    // Seed the custom inputs from the window currently in view so switching to
    // Custom does not present two empty fields.
    const current = getRange(value.range);

    onChange({
      ...value,
      range: next,
      from: value.from ?? (current ? toDateTimeLocalValue(current.from) : ""),
      to: value.to ?? (current ? toDateTimeLocalValue(current.to) : ""),
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={label}
    >
      {TIME_RANGES.map((range) => (
        <button
          type="button"
          key={range}
          aria-pressed={value.range === range}
          onClick={() => handleRangeChange(range)}
          className={`text-sm px-3 py-1.5 rounded-md border transition ${
            value.range === range
              ? "bg-primary text-[var(--on-primary)] border-transparent"
              : "bg-surface border-subtle hover:bg-surface-alt"
          }`}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}

      {value.range === "custom" && (
        <div className="w-full space-y-2">
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <input
              type="datetime-local"
              aria-label="Range start"
              value={value.from ?? ""}
              max={value.to || undefined}
              aria-invalid={rangeInverted ? true : undefined}
              aria-describedby={rangeInverted ? rangeErrorId : undefined}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="min-h-10 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm"
            />

            <input
              type="datetime-local"
              aria-label="Range end"
              value={value.to ?? ""}
              min={value.from || undefined}
              aria-invalid={rangeInverted ? true : undefined}
              aria-describedby={rangeInverted ? rangeErrorId : undefined}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="min-h-10 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm"
            />
          </div>

          {rangeInverted ? (
            // An inverted range produced an empty view with only the generic
            // no-results message, giving no hint that the range was the
            // problem.
            <p
              id={rangeErrorId}
              role="alert"
              className="text-sm text-[var(--highlight)]"
            >
              The start must not be after the end. Times are interpreted in your
              local timezone ({localTimeZone}).
            </p>
          ) : (
            <p className="text-sm text-muted">
              Times are interpreted in your local timezone ({localTimeZone}).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
