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
    expect(
      screen.getByRole("link", { name: /Organizations/i }),
    ).toBeInTheDocument();
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

  it("exposes the mobile drawer as a named dialog", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar mobileOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
  });

  it("closes the drawer on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar mobileOpen onClose={onClose} />
      </MemoryRouter>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("does not make the backdrop a tab stop", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar mobileOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    // It used to be a full-viewport button, so Tab landed on an invisible
    // screen-sized control before reaching any navigation link.
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    expect(backdrop?.tagName).not.toBe("BUTTON");
  });

  it("locks page scroll while the drawer is open", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar mobileOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
