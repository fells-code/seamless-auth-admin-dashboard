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
}: {
  roles: string[];
  selected: string[];
  onChange: (roles: string[]) => void;
}) {
  function toggle(role: string) {
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
            onClick={() => toggle(role)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 cursor-pointer
              ${
                active
                  ? "bg-primary text-white border-transparent shadow-sm"
                  : "bg-surface border-subtle text-muted hover:bg-surface-alt hover:text-primary"
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
