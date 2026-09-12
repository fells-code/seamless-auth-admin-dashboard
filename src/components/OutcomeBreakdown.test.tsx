/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OutcomeBreakdown from "./OutcomeBreakdown";

describe("OutcomeBreakdown", () => {
  it("renders each entry with its rate and the count behind it", () => {
    render(
      <OutcomeBreakdown
        title="By device"
        entries={[
          {
            key: "ios",
            label: "iOS",
            success: 40,
            failed: 2,
            total: 42,
            rate: 40 / 42,
          },
          {
            key: "",
            label: "Unknown",
            success: 1,
            failed: 1,
            total: 2,
            rate: 0.5,
          },
        ]}
        emptyDescription="Nothing yet"
      />,
    );

    const group = screen.getByRole("group", { name: "By device" });
    const items = within(group).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("iOS");
    expect(items[0]).toHaveTextContent("95%");
    expect(items[0]).toHaveTextContent("40 of 42");
    expect(items[1]).toHaveTextContent("Unknown");
    expect(items[1]).toHaveTextContent("50%");
    expect(items[1]).toHaveTextContent("1 of 2");
  });

  it("says when there is nothing to break down", () => {
    render(
      <OutcomeBreakdown
        title="By mail provider"
        entries={[]}
        emptyDescription="No factors presented in the last 24 hours"
      />,
    );

    expect(
      screen.getByText("No factors presented in the last 24 hours"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
