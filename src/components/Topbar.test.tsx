/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Topbar from "./Topbar";

vi.mock("./UserMenu", () => ({
  default: () => <div>User menu</div>,
}));

describe("Topbar", () => {
  it("renders the user controls area", () => {
    render(
      <MemoryRouter initialEntries={["/events"]}>
        <Topbar />
      </MemoryRouter>,
    );

    expect(screen.getByText("User menu")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Open navigation menu/i }),
    ).toBeInTheDocument();
  });

  it("titles every navigable route", () => {
    const routes = [
      ["/", "Overview"],
      ["/users", "Users"],
      ["/sessions", "Sessions"],
      ["/events", "Events"],
      ["/security", "Security"],
      ["/system", "System"],
      ["/organizations", "Organizations"],
      ["/profile", "Profile"],
    ] as const;

    for (const [path, title] of routes) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <Topbar />
        </MemoryRouter>,
      );

      expect(screen.getByText(title)).toBeInTheDocument();
      unmount();
    }
  });
});
