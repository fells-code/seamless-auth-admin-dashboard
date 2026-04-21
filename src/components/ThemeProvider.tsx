/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ThemeContext,
  applyAppearance,
  getInitialAppearance,
  persistAppearance,
  themes,
  type Appearance,
  type ThemeContextValue,
} from "../lib/theme";

export default function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [appearance, setAppearance] = useState<Appearance>(getInitialAppearance);

  useEffect(() => {
    applyAppearance(appearance);
    persistAppearance(appearance);
  }, [appearance]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...appearance,
      themes,
      setMode: (mode) => setAppearance((prev) => ({ ...prev, mode })),
      toggleMode: () =>
        setAppearance((prev) => ({
          ...prev,
          mode: prev.mode === "light" ? "dark" : "light",
        })),
      setThemeName: (themeName) =>
        setAppearance((prev) => ({ ...prev, themeName })),
    }),
    [appearance],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
