/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PieChart from "./PieChart";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const data = [
  { type: "login", label: "Login", count: 12 },
  { type: "oauth", label: "OAuth", count: 4 },
  { type: "other", label: "Other", count: 1 },
];

function renderChart(items = data) {
  return render(
    <MemoryRouter>
      <PieChart data={items} />
    </MemoryRouter>,
  );
}

describe("PieChart", () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it("keeps its empty state", () => {
    renderChart([]);

    expect(screen.getByText("No event data yet")).toBeInTheDocument();
  });

  it("gives the chart an accessible name summarising the distribution", () => {
    renderChart();

    expect(
      screen.getByRole("img", { name: /17 events across 3 categories/ }),
    ).toBeInTheDocument();
  });

  it("offers each category as a keyboard-operable control", async () => {
    const user = userEvent.setup();
    renderChart();

    // The segments were clickable but not focusable, so the filtering the chart
    // offered was unreachable by keyboard and undiscoverable besides.
    const login = screen.getByRole("button", { name: "Login (12)" });

    login.focus();
    expect(login).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(navigate).toHaveBeenCalledWith("/events?type=login");
  });

  it("sends the catch-all category to the unfiltered feed", async () => {
    const user = userEvent.setup();
    renderChart();

    await user.click(screen.getByRole("button", { name: "Other (1)" }));

    expect(navigate).toHaveBeenCalledWith("/events");
  });
});
