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

  it("adds a second event type instead of replacing the first", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <EventFilters
        value={{ ...defaultValue, type: ["login"] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Security" }));

    // The query layer and the URL format both already accepted several types;
    // the interface was the only thing preventing it.
    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      type: ["login", "security"],
    });
  });

  it("removes a selected type when it is chosen again", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <EventFilters
        value={{ ...defaultValue, type: ["login", "security"] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      type: ["security"],
    });
  });

  it("clears every type when All is chosen", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <EventFilters
        value={{ ...defaultValue, type: ["login", "security"] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "All" }));

    expect(onChange).toHaveBeenCalledWith({ ...defaultValue, type: [] });
  });

  it("exposes the selected state of each type toggle", () => {
    render(
      <EventFilters
        value={{ ...defaultValue, type: ["login"] }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Login" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "OAuth" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports an inverted custom range instead of just returning nothing", () => {
    render(
      <EventFilters
        value={{
          type: [],
          range: "custom",
          from: "2026-07-20T10:00",
          to: "2026-07-19T10:00",
        }}
        onChange={vi.fn()}
      />,
    );

    // Without this the table simply came back empty with the generic no-results
    // message and no hint that the range itself was the problem.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The start must not be after the end.",
    );
    expect(screen.getByLabelText("Range start")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("names the timezone the custom range is interpreted in", () => {
    render(
      <EventFilters
        value={{
          type: [],
          range: "custom",
          from: "2026-07-19T10:00",
          to: "2026-07-20T10:00",
        }}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Times are interpreted in your local timezone/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
