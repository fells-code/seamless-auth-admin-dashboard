/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/components/SearchInput.tsx
import { useId } from "react";
import { Search, X } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  label = "Search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Names the field for assistive technology. A placeholder is not a label. */
  label?: string;
}) {
  const id = useId();

  return (
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      {/* Icon */}
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />

      {/* Input */}
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-md border border-subtle bg-surface-alt py-2 pl-9 pr-9 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
