/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyAppearance,
  getInitialAppearance,
  persistAppearance,
} from "./theme";

describe("theme helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
  });

  it("returns and applies the default appearance", () => {
    const appearance = getInitialAppearance();

    expect(appearance).toEqual({ mode: "light", themeName: "autumn" });
    expect(document.documentElement.dataset.theme).toBe("autumn");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("uses valid stored theme and legacy mode values", () => {
    localStorage.setItem("theme-name", "winter");
    localStorage.setItem("theme", "dark");

    const appearance = getInitialAppearance();

    expect(appearance).toEqual({ mode: "dark", themeName: "winter" });
    expect(document.documentElement.dataset.theme).toBe("winter");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("ignores invalid stored appearance values", () => {
    localStorage.setItem("theme-name", "banana");
    localStorage.setItem("theme-mode", "blue");

    expect(getInitialAppearance()).toEqual({
      mode: "light",
      themeName: "autumn",
    });
  });

  it("persists and applies an appearance", () => {
    persistAppearance({ mode: "dark", themeName: "developer" });
    applyAppearance({ mode: "dark", themeName: "developer" });

    expect(localStorage.getItem("theme-name")).toBe("developer");
    expect(localStorage.getItem("theme-mode")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("developer");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
