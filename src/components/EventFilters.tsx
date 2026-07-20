/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { eventGroups } from "../lib/eventGroups";
import { getRange, toDateTimeLocalValue } from "../lib/timeRange";
import type { EventFilter } from "../pages/Events";

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
  const applyGroup = (group: {
    label: string;
    value: string;
    match: (t: string) => boolean;
  }) => {
    onChange({
      ...value,
      type: group.value === "" ? [] : [group.value],
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
              onClick={() => applyGroup(group)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                active
                  ? "bg-primary text-white border-transparent"
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
                ? "bg-primary text-white border-transparent"
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
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <input
              type="datetime-local"
              value={value.from ?? ""}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="min-h-10 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm"
            />

            <input
              type="datetime-local"
              value={value.to ?? ""}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="min-h-10 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
