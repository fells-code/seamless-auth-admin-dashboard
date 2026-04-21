/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from "lucide-react";

type Column<T, K extends keyof T = keyof T> = {
  key: K;
  label: string;
  sortable?: boolean;
  render?: (value: T[K], row: T) => React.ReactNode;
};

type RowAction<T> = {
  icon: React.ComponentType<{ size?: number }>;
  onClick: (row: T) => void;
  label?: string;
  variant?: "default" | "danger";
};

type BulkAction<T> = {
  label: string;
  onClick: (rows: T[]) => void;
  variant?: "default" | "danger";
};

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  selectable = false,
  actions = [],
  bulkActions = [],
  emptyTitle = "Nothing to show",
  emptyDescription = "This view does not have any rows yet.",
  total,
  limit = 20,
  offset = 0,
  onPageChange,
}: {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  actions?: RowAction<T>[];
  bulkActions?: BulkAction<T>[];
  emptyTitle?: string;
  emptyDescription?: string;
  total?: number;
  limit?: number;
  offset?: number;
  onPageChange?: (offset: number) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const toggleSelect = (index: number) => {
    const next = new Set(selected);

    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }

    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((_, i) => i)));
    }
  };

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selected.size > 0 && selected.size < data.length;
    }
  }, [selected, data.length]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;

    const valA = a[sortKey];
    const valB = b[sortKey];

    if (valA == null) return 1;
    if (valB == null) return -1;

    return direction === "asc"
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const gridTemplate = `${
    selectable ? "40px " : ""
  }repeat(${columns.length}, minmax(120px, 1fr)) ${
    actions.length ? "80px" : ""
  }`;

  const selectedRows: T[] = [...selected].map((i) => sortedData[i]);
  const hasRows = sortedData.length > 0;
  const displayTotal = total ?? sortedData.length;
  const rangeStart = hasRows ? offset + 1 : 0;
  const rangeEnd = hasRows ? offset + sortedData.length : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-subtle bg-surface shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]">
      {selected.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center justify-between border-b border-subtle bg-surface-alt px-4 py-3">
          <div className="text-sm text-muted">
            {selected.size} selected for bulk action
          </div>

          <div className="flex gap-2">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => action.onClick(selectedRows)}
                className={clsx(
                  "rounded-md px-3 py-1 text-sm transition",
                  action.variant === "danger"
                    ? "text-[var(--highlight)] hover:bg-[color:var(--highlight)]/10"
                    : "hover:bg-surface",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-subtle bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-alt)_72%,transparent),transparent)] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
              Results
            </div>
            <div className="text-sm text-primary">
              {displayTotal} total {displayTotal === 1 ? "row" : "rows"}
            </div>
          </div>

          {sortKey && (
            <div className="rounded-full border border-subtle bg-surface px-3 py-1 text-xs text-muted">
              Sorted by {String(sortKey)} {direction}
            </div>
          )}
        </div>

        <div
          className="mt-3 grid items-center gap-3 text-xs uppercase tracking-[0.18em] text-subtle"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {selectable && (
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              checked={selected.size === data.length && data.length > 0}
              onChange={toggleAll}
              className="accent-[var(--primary)]"
            />
          )}

          {columns.map((col) => {
            const SortIcon =
              sortKey !== col.key
                ? ArrowUpDown
                : direction === "asc"
                  ? ArrowUp
                  : ArrowDown;

            return (
              <button
                key={String(col.key)}
                type="button"
                className={clsx(
                  "flex items-center gap-1 text-left",
                  !col.sortable && "cursor-default",
                  col.sortable && "transition hover:text-primary",
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span>{col.label}</span>
                {col.sortable && <SortIcon size={12} />}
              </button>
            );
          })}

          {actions.length > 0 && <div className="text-right">Actions</div>}
        </div>
      </div>

      {!hasRows ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="rounded-full border border-subtle bg-surface-alt p-3 text-muted">
            <Inbox size={20} />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-primary">{emptyTitle}</div>
            <div className="max-w-md text-sm text-muted">
              {emptyDescription}
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[color:var(--border)]/70">
          {sortedData.map((row, i) => {
            const isSelected = selected.has(i);

            return (
              <div
                key={i}
                className={clsx(
                  "grid items-center gap-3 px-4 py-3 transition-all",
                  "hover:bg-[color:var(--surface-alt)]/45",
                  isSelected &&
                    "bg-[color:var(--accent-soft)]/40 ring-1 ring-inset ring-[var(--primary)]",
                )}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {selectable && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(i)}
                    className="accent-[var(--primary)]"
                  />
                )}

                {columns.map((col) => (
                  <div
                    key={String(col.key)}
                    className="min-w-0 truncate text-sm text-primary"
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] as React.ReactNode)}
                  </div>
                ))}

                {actions.length > 0 && (
                  <div className="flex justify-end gap-2">
                    {actions.map((action, idx) => {
                      const Icon = action.icon;

                      return (
                        <button
                          key={idx}
                          onClick={() => action.onClick(row)}
                          title={action.label}
                          className={clsx(
                            "rounded-md p-1.5 transition",
                            action.variant === "danger"
                              ? "text-[var(--highlight)] hover:bg-[color:var(--highlight)]/10"
                              : "text-muted hover:bg-surface-alt hover:text-primary",
                          )}
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total !== undefined && onPageChange && (
        <div className="flex items-center justify-between border-t border-subtle px-4 py-3">
          <div className="text-sm text-muted">
            Showing {rangeStart}-{rangeEnd} of {total}
          </div>

          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              className="btn btn-secondary disabled:opacity-40"
            >
              Prev
            </button>

            <button
              disabled={offset + limit >= total}
              onClick={() => onPageChange(offset + limit)}
              className="btn btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
