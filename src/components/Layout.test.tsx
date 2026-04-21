/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Layout from "./Layout";

vi.mock("./Sidebar", () => ({
  default: () => <div>Sidebar shell</div>,
}));

vi.mock("./Topbar", () => ({
  default: () => <div>Topbar shell</div>,
}));

describe("Layout", () => {
  it("renders the shell and the nested route outlet", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>Overview content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Sidebar shell")).toBeInTheDocument();
    expect(screen.getByText("Topbar shell")).toBeInTheDocument();
    expect(screen.getByText("Overview content")).toBeInTheDocument();
  });
});
