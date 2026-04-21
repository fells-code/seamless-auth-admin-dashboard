/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createContext } from "react";

export type ThemeMode = "light" | "dark";
export type ThemeName = "autumn" | "winter" | "summer" | "spring" | "developer";

export type ThemeOption = {
  value: ThemeName;
  label: string;
  description: string;
  swatches: [string, string, string];
};

export type Appearance = {
  mode: ThemeMode;
  themeName: ThemeName;
};

export type ThemeContextValue = Appearance & {
  themes: ThemeOption[];
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setThemeName: (themeName: ThemeName) => void;
};

const THEME_STORAGE_KEY = "theme-name";
const MODE_STORAGE_KEY = "theme-mode";
const LEGACY_MODE_STORAGE_KEY = "theme";

export const themes: ThemeOption[] = [
  {
    value: "autumn",
    label: "Autumn",
    description: "Warm earth tones and copper accents",
    swatches: ["#b64e39", "#3f626a", "#f3e6df"],
  },
  {
    value: "winter",
    label: "Winter",
    description: "Snowy stone, alpine blue, and glacial slate",
    swatches: ["#5e89a6", "#2f4e63", "#eff5f8"],
  },
  {
    value: "summer",
    label: "Summer",
    description: "Sunlit sand, bright surf, and deep ocean blues",
    swatches: ["#f2bf63", "#33a6c9", "#f8edd2"],
  },
  {
    value: "spring",
    label: "Spring",
    description: "Fresh blooms, new grass, and warm morning light",
    swatches: ["#e88fb0", "#7fbf74", "#f4d96c"],
  },
  {
    value: "developer",
    label: "Developer",
    description: "Low-glare graphite, terminal cyan, and focused contrast",
    swatches: ["#3aaed8", "#1f2933", "#3a4651"],
  },
];

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeName(value: string | null): value is ThemeName {
  return (
    value === "autumn" ||
    value === "winter" ||
    value === "summer" ||
    value === "spring" ||
    value === "developer"
  );
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function applyAppearance({ mode, themeName }: Appearance) {
  document.documentElement.dataset.theme = themeName;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function getInitialAppearance(): Appearance {
  if (typeof window === "undefined") {
    return { mode: "light", themeName: "autumn" };
  }

  const storedThemeName = localStorage.getItem(THEME_STORAGE_KEY);
  const storedMode =
    localStorage.getItem(MODE_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_MODE_STORAGE_KEY);

  const initial: Appearance = {
    themeName: isThemeName(storedThemeName) ? storedThemeName : "autumn",
    mode: isThemeMode(storedMode) ? storedMode : "light",
  };

  applyAppearance(initial);

  return initial;
}

export function persistAppearance({ mode, themeName }: Appearance) {
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}
