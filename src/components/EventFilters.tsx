/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useState } from "react";
import { eventGroups } from "../lib/eventGroups";
import { getRange } from "../lib/timeRange";
import { AuthEventTypeEnum } from "../types/authEventTypes";
import type { EventFilter } from "../pages/Events";

const allTypes = AuthEventTypeEnum.options;

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
  const [range, setRange] = useState(value.range ?? "24h");

  const applyGroup = (group: {
    label: string;
    value: string;
    match: (t: string) => boolean;
  }) => {
    const types = group.value === "" ? [] : allTypes.filter(group.match);

    onChange({
      ...value,
      type: types,
    });
  };

  const handleRangeChange = (r: typeof range) => {
    setRange(r);

    if (r !== "custom") {
      const rangeVal = getRange(r);

      if (rangeVal) {
        onChange({
          ...value,
          range: r,
          from: rangeVal.from.toISOString(),
          to: rangeVal.to.toISOString(),
        });
      }
    } else {
      onChange({
        ...value,
        range: r,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Type Pills */}
      <div className="flex flex-wrap gap-2">
        {eventGroups.map((group) => {
          const active =
            group.value === ""
              ? value.type.length === 0
              : value.type.some(group.match);

          return (
            <button
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
            key={r}
            onClick={() =>
              handleRangeChange(r as "1h" | "24h" | "7d" | "custom")
            }
            className={`text-sm px-3 py-1.5 rounded-md border transition ${
              range === r
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

        {range === "custom" && (
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={value.from ?? ""}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="px-3 py-2 rounded-md border border-subtle bg-surface-alt text-sm"
            />

            <input
              type="datetime-local"
              value={value.to ?? ""}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="px-3 py-2 rounded-md border border-subtle bg-surface-alt text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
