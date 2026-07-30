/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/components/RoleChips.tsx
export default function RoleChips({
  roles,
  selected,
  onChange,
  disabled,
}: {
  roles: string[];
  selected: string[];
  onChange: (roles: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(role: string) {
    if (disabled) return;

    if (selected.includes(role)) {
      onChange(selected.filter((r) => r !== role));
    } else {
      onChange([...selected, role]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const active = selected.includes(role);

        return (
          <button
            key={role}
            type="button"
            // Selection is otherwise carried by colour alone, which says nothing
            // to a screen reader and nothing to anyone who cannot rely on the
            // contrast between the two states.
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(role)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60
              ${disabled ? "" : "cursor-pointer"}
              ${
                active
                  ? "bg-primary text-[var(--on-primary)] border-transparent shadow-sm"
                  : "bg-surface border-subtle text-muted enabled:hover:bg-surface-alt enabled:hover:text-primary"
              }
            `}
          >
            {role}
          </button>
        );
      })}
    </div>
  );
}
