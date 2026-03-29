/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

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
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    next.has(index) ? next.delete(index) : next.add(index);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((_, i) => i)));
    }
  };

  // indeterminate state
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

  return (
    <div className="space-y-3">
      {/* BULK ACTION BAR */}
      {selected.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-subtle bg-surface-alt px-4 py-2">
          <div className="text-sm text-muted">{selected.size} selected</div>

          <div className="flex gap-2">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => action.onClick(selectedRows)}
                className={clsx(
                  "text-sm px-3 py-1 rounded",
                  action.variant === "danger"
                    ? "text-red-400 hover:bg-red-500/10"
                    : "hover:bg-surface",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div
        className="grid items-center px-4 pb-2 text-subtle text-xs uppercase tracking-wide"
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

        {columns.map((col) => (
          <div
            key={String(col.key)}
            className={clsx(
              col.sortable &&
                "cursor-pointer hover:text-primary flex items-center gap-1",
            )}
            onClick={() => col.sortable && handleSort(col.key)}
          >
            {col.label}

            {col.sortable && sortKey === col.key && (
              <span className="text-[10px]">
                {direction === "asc" ? "▲" : "▼"}
              </span>
            )}
          </div>
        ))}

        {actions.length > 0 && <div />}
      </div>

      {/* ROWS */}
      {sortedData.map((row, i) => {
        const isSelected = selected.has(i);

        return (
          <div
            key={i}
            className={clsx(
              "grid items-center gap-3 rounded-xl border border-subtle bg-surface px-4 py-3 transition-all",
              "hover:shadow-md hover:-translate-y-[1px]",
              isSelected && "ring-1 ring-[var(--primary)]",
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
              <div key={String(col.key)} className="truncate text-sm">
                {col.render
                  ? col.render(row[col.key], row)
                  : (row[col.key] as React.ReactNode)}
              </div>
            ))}

            {/* ACTIONS */}
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
                        "p-1.5 rounded-md transition",
                        action.variant === "danger"
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-muted hover:bg-surface-alt",
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

      {/* PAGINATION */}
      {total !== undefined && onPageChange && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
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
