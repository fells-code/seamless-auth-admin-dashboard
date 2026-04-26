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
});
