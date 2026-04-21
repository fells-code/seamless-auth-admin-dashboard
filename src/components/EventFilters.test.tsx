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

  it("applies relative time ranges with concrete timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

    const onChange = vi.fn();

    render(<EventFilters value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      range: "7d",
      from: "2026-04-14T12:00:00.000Z",
      to: "2026-04-21T12:00:00.000Z",
    });
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
