/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RangeFilter from "./RangeFilter";

describe("RangeFilter", () => {
  it("marks the selected range as pressed", () => {
    render(<RangeFilter value={{ range: "7d" }} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "24h" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clears stale bounds when a relative range is chosen", () => {
    const onChange = vi.fn();

    render(
      <RangeFilter
        value={{
          range: "custom",
          from: "2026-01-01T00:00",
          to: "2026-01-02T00:00",
        }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "1h" }));

    // A relative range is resolved when the query runs, so bounds left behind
    // would describe a window the highlighted button does not.
    expect(onChange).toHaveBeenCalledWith({
      range: "1h",
      from: undefined,
      to: undefined,
    });
  });

  it("seeds the custom inputs from the window currently in view", () => {
    const onChange = vi.fn();

    render(<RangeFilter value={{ range: "24h" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    const next = onChange.mock.calls[0]![0];
    expect(next.range).toBe("custom");
    expect(next.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(next.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("reports an inverted custom range instead of showing an empty view", () => {
    render(
      <RangeFilter
        value={{
          range: "custom",
          from: "2026-01-02T00:00",
          to: "2026-01-01T00:00",
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /start must not be after the end/i,
    );
    expect(screen.getByLabelText("Range start")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("names the control group so its purpose is clear on a page of filters", () => {
    render(
      <RangeFilter
        value={{ range: "24h" }}
        onChange={vi.fn()}
        label="Login statistics time range"
      />,
    );

    expect(
      screen.getByRole("group", { name: "Login statistics time range" }),
    ).toBeInTheDocument();
  });
});
