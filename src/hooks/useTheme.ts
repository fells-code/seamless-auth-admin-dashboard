/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;

    const initial = stored ?? "light";

    // apply immediately (no effect needed)
    document.documentElement.classList.toggle("dark", initial === "dark");

    return initial;
  });

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";

    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, toggle };
}
