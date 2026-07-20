/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { X } from "lucide-react";

/**
 * A list of values that can be removed, for editing a set rather than choosing
 * from one. Deliberately distinct from RoleChips: a chip that looks like a
 * toggle but deletes the underlying value on click is easy to trigger by
 * mistake, so removal has its own control here.
 */
export default function RemovableChips({
  values,
  onRemove,
  disabled = false,
  removeLabel = (value: string) => `Remove ${value}`,
  emptyLabel = "Nothing configured yet.",
}: {
  values: string[];
  onRemove: (value: string) => void;
  disabled?: boolean;
  removeLabel?: (value: string) => string;
  emptyLabel?: string;
}) {
  if (values.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1.5 rounded-full border border-subtle bg-surface px-3 py-1.5 text-sm text-primary"
        >
          {value}

          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(value)}
              aria-label={removeLabel(value)}
              title={removeLabel(value)}
              className="rounded-full p-0.5 text-muted transition-colors hover:bg-surface-alt hover:text-[var(--highlight)]"
            >
              <X size={14} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
