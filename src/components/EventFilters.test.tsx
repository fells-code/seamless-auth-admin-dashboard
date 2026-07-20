/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EventFilters from "./EventFilters";
import type { EventFilter } from "../pages/Events";

const defaultValue: EventFilter = {
  type: [],
  range: "24h",
};

describe("EventFilters", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies grouped quick filters", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<EventFilters value={defaultValue} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      type: ["login"],
    });
  });

  it("selects a relative range without pinning bounds to it", () => {
    const onChange = vi.fn();

    render(<EventFilters value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    // Relative ranges carry no bounds. They are resolved against a reference
    // time when the query runs, so the window always means what the label says
    // and no ISO string ends up in the datetime-local state.
    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      range: "7d",
      from: undefined,
      to: undefined,
    });
  });

  it("seeds the custom inputs with values a datetime-local control accepts", () => {
    const onChange = vi.fn();

    render(<EventFilters value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    const call = onChange.mock.calls[0][0] as {
      range: string;
      from: string;
      to: string;
    };

    expect(call.range).toBe("custom");
    expect(call.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(call.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("updates custom datetime inputs", () => {
    const onChange = vi.fn();
    const value: EventFilter = {
      type: ["security"],
      range: "custom",
      from: "2026-04-21T08:00",
      to: "2026-04-21T10:00",
    };

    render(<EventFilters value={value} onChange={onChange} />);

    const [fromInput, toInput] = screen.getAllByDisplayValue(
      /2026-04-21T(08|10):00/,
    );

    fireEvent.change(fromInput, { target: { value: "2026-04-20T09:30" } });
    fireEvent.change(toInput, { target: { value: "2026-04-21T11:45" } });

    expect(onChange).toHaveBeenNthCalledWith(1, {
      ...value,
      from: "2026-04-20T09:30",
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      ...value,
      to: "2026-04-21T11:45",
    });
  });
});
