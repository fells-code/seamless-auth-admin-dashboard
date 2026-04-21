/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ThemeProvider from "./ThemeProvider";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../hooks/useTheme";

function ThemeConsumer() {
  const { mode, themeName, setThemeName, toggleMode } = useTheme();

  return (
    <div>
      <div>{`${themeName}:${mode}`}</div>
      <button onClick={() => setThemeName("winter")}>Use winter</button>
      <button onClick={toggleMode}>Toggle mode</button>
      <ThemeToggle />
    </div>
  );
}

describe("ThemeProvider", () => {
  it("hydrates from storage and updates appearance through context", async () => {
    localStorage.setItem("theme-name", "summer");
    localStorage.setItem("theme-mode", "light");
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByText("summer:light")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("summer");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Use winter" }));

    expect(screen.getByText("winter:light")).toBeInTheDocument();
    expect(localStorage.getItem("theme-name")).toBe("winter");

    await user.click(screen.getByRole("button", { name: "Toggle mode" }));

    expect(screen.getByText("winter:dark")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(screen.getByRole("button", { name: "light" }));

    expect(screen.getByText("winter:light")).toBeInTheDocument();
  });

  it("throws when the theme hook is used outside the provider", () => {
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );
  });
});
