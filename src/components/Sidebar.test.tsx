/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("renders the admin navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Seamless Auth")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /System/i })).toBeInTheDocument();
  });

  it("marks the current route as active", () => {
    render(
      <MemoryRouter initialEntries={["/security"]}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Security/i })).toHaveClass(
      "bg-primary/10",
    );
    expect(screen.getByRole("link", { name: /Overview/i })).not.toHaveClass(
      "bg-primary/10",
    );
  });

  it("renders a closable mobile drawer", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar mobileOpen onClose={onClose} />
      </MemoryRouter>,
    );

    await user.click(
      screen.getAllByRole("button", { name: /Close navigation menu/i })[0],
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });
});
