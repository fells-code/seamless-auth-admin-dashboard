/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
});
