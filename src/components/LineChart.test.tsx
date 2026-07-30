/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LineChart from "./LineChart";

const data = [
  { bucket: "2026-07-20T10:00:00.000Z", success: 12, failed: 3 },
  { bucket: "2026-07-20T11:00:00.000Z", success: 8, failed: 1 },
];

describe("LineChart", () => {
  it("renders an explicit empty state rather than a bare frame", () => {
    render(<LineChart data={[]} />);

    // The pie chart on the same screens already did this. Drawing only axes
    // left a quiet deployment indistinguishable from a chart that failed.
    expect(
      screen.getByText("No authentication activity in this period"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("gives the chart an accessible name summarising the series", () => {
    render(<LineChart data={data} />);

    expect(
      screen.getByRole("img", {
        name: /20 successful and 4 failed events across 2 intervals/,
      }),
    ).toBeInTheDocument();
  });

  it("exposes the underlying values as a table alternative", () => {
    render(<LineChart data={data} />);

    const table = screen.getByRole("table", {
      name: "Authentication activity over time",
    });

    expect(table).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Success" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(data.length + 1);
  });
});
