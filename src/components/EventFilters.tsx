/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useId } from "react";
import { eventGroups } from "../lib/eventGroups";
import { getRange, toDateTimeLocalValue } from "../lib/timeRange";
import type { EventFilter } from "../pages/Events";

const localTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local time";

export default function EventFilters({
  value,
  onChange,
}: {
  value: {
    type: string[];
    from?: string;
    to?: string;
    range: "1h" | "24h" | "7d" | "custom";
  };
  onChange: (v: EventFilter) => void;
}) {
  const rangeErrorId = useId();
  const rangeInverted = Boolean(
    value.from && value.to && new Date(value.from) > new Date(value.to),
  );
  // Selecting a type used to replace the selection rather than add to it, even
  // though the query layer and the URL format both accept several. "All" stays
  // exclusive: it means no type filter.
  const toggleGroup = (group: { value: string }) => {
    if (group.value === "") {
      onChange({ ...value, type: [] });
      return;
    }

    const selected = value.type.includes(group.value);

    onChange({
      ...value,
      type: selected
        ? value.type.filter((current) => current !== group.value)
        : [...value.type, group.value],
    });
  };

  const handleRangeChange = (r: EventFilter["range"]) => {
    if (r !== "custom") {
      // Relative ranges carry no bounds; they are resolved when the query runs
      // so the window is always current.
      onChange({ ...value, range: r, from: undefined, to: undefined });
      return;
    }

    // Seed the custom inputs from the window currently in view so switching to
    // Custom does not present two empty fields.
    const current = getRange(value.range);

    onChange({
      ...value,
      range: r,
      from: value.from ?? (current ? toDateTimeLocalValue(current.from) : ""),
      to: value.to ?? (current ? toDateTimeLocalValue(current.to) : ""),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Type Pills */}
      <div className="flex flex-wrap gap-2">
        {eventGroups.map((group) => {
          const active =
            group.value === ""
              ? value.type.length === 0
              : value.type.includes(group.value) ||
                value.type.some(group.match);

          return (
            <button
              type="button"
              key={group.value}
              aria-pressed={active}
              onClick={() => toggleGroup(group)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                active
                  ? "bg-primary text-[var(--on-primary)] border-transparent"
                  : "bg-surface border-subtle hover:bg-surface-alt text-muted"
              }`}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {/* Time Range */}
      <div className="flex flex-wrap items-center gap-2">
        {["1h", "24h", "7d", "custom"].map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => handleRangeChange(r as EventFilter["range"])}
            className={`text-sm px-3 py-1.5 rounded-md border transition ${
              value.range === r
                ? "bg-primary text-[var(--on-primary)] border-transparent"
                : "bg-surface border-subtle hover:bg-surface-alt"
            }`}
          >
            {r === "1h" && "1h"}
            {r === "24h" && "24h"}
            {r === "7d" && "7d"}
            {r === "custom" && "Custom"}
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
              // An inverted range produced an empty table with only the generic
              // no-results message, giving no hint that the range was the
              // problem.
              <p
                id={rangeErrorId}
                role="alert"
                className="text-sm text-[var(--highlight)]"
              >
                The start must not be after the end. Times are interpreted in
                your local timezone ({localTimeZone}).
              </p>
            ) : (
              <p className="text-sm text-muted">
                Times are interpreted in your local timezone ({localTimeZone}).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
