/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="inline-flex rounded-lg border border-subtle bg-[var(--surface-alt)] p-1">
      {(["light", "dark"] as const).map((nextMode) => {
        const active = mode === nextMode;

        return (
          <button
            key={nextMode}
            onClick={() => setMode(nextMode)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
              active
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            }`}
          >
            {nextMode}
          </button>
        );
      })}
    </div>
  );
}
