/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { eventGroups } from "../lib/eventGroups";
import RangeFilter from "./RangeFilter";
import type { EventFilter } from "../pages/Events";

export default function EventFilters({
  value,
  onChange,
}: {
  value: EventFilter;
  onChange: (v: EventFilter) => void;
}) {
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

      <RangeFilter
        value={value}
        onChange={(range) => onChange({ ...value, ...range })}
      />
    </div>
  );
}
