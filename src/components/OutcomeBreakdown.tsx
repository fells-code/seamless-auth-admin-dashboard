/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { BreakdownEntry } from "../lib/signInBreakdown";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/**
 * Success rate per value of one dimension, busiest first.
 *
 * A rate over a handful of attempts is shown with the count beside it rather
 * than hidden: 50% of two attempts and 50% of two thousand look the same as a
 * bar, and only one of them means anything.
 */
export default function OutcomeBreakdown({
  title,
  entries,
  emptyDescription,
}: {
  title: string;
  entries: BreakdownEntry[];
  emptyDescription: string;
}) {
  return (
    <div
      className="rounded-2xl border border-subtle bg-surface p-4"
      role="group"
      aria-label={title}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {title}
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{emptyDescription}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {entries.map((entry) => (
            <li key={entry.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-primary">{entry.label}</span>
                <span className="shrink-0 tabular-nums text-primary">
                  {formatPercent(entry.rate)}
                  <span className="ml-2 text-xs text-muted">
                    {entry.success.toLocaleString()} of{" "}
                    {entry.total.toLocaleString()}
                  </span>
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-alt"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--accent))]"
                  style={{ width: `${Math.round(entry.rate * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
