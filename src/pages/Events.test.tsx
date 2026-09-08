/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Events from "./Events";

const mocks = vi.hoisted(() => ({
  useEvents: vi.fn(),
}));

vi.mock("../hooks/useEvents", () => ({
  useEvents: mocks.useEvents,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="search">{location.search}</div>;
}

function renderPage(initialEntry = "/events") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/events"
          element={
            <>
              <Events />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** Bounds the page passed to the query on its most recent render. */
function lastBounds() {
  const calls = mocks.useEvents.mock.calls;
  return calls[calls.length - 1][0] as { from?: string; to?: string };
}

function spanMs(bounds: { from?: string; to?: string }) {
  return (
    new Date(bounds.to as string).getTime() -
    new Date(bounds.from as string).getTime()
  );
}

const HOUR = 1000 * 60 * 60;

describe("Events time range", () => {
  beforeEach(() => {
    mocks.useEvents.mockReset();
    mocks.useEvents.mockReturnValue({
      data: { events: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("applies concrete bounds for the default 24h range", () => {
    renderPage();

    const bounds = lastBounds();
    expect(bounds.from).toBeDefined();
    expect(bounds.to).toBeDefined();
    expect(spanMs(bounds)).toBe(24 * HOUR);
  });

  it("keeps a relative range selected instead of falling back to custom", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "1h" }));

    // The chosen range is carried in the URL, so it survives the round trip.
    await waitFor(() =>
      expect(screen.getByTestId("search").textContent).toContain("range=1h"),
    );

    // Custom date inputs belong to the custom range only.
    expect(
      document.querySelectorAll('input[type="datetime-local"]'),
    ).toHaveLength(0);

    await waitFor(() => expect(spanMs(lastBounds())).toBe(HOUR));
  });

  it("restores a relative range from the URL", () => {
    renderPage("/events?range=7d");

    expect(spanMs(lastBounds())).toBe(7 * 24 * HOUR);
  });

  it("shows prefilled custom inputs that a datetime-local control accepts", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Custom" }));

    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[type="datetime-local"]',
      ),
    );

    expect(inputs).toHaveLength(2);

    // An ISO string with a trailing Z renders as an empty control, so the
    // seeded values must be in the local YYYY-MM-DDTHH:mm form.
    for (const input of inputs) {
      expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    }
  });

  it("counts a relative range as an active filter", async () => {
    const user = userEvent.setup();
    renderPage();

    const panel = () =>
      screen.getByText("Filters active").closest("div.rounded-2xl")!;

    // The default 24h window is the unfiltered view, so it is not a filter.
    expect(panel()).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: "7d" }));

    // Choosing "last 7 days" used to still report zero, because the count came
    // from explicit from/to bounds that a relative range never sets, while a
    // custom range counted as two.
    await waitFor(() => expect(panel()).toHaveTextContent("1"));
  });

  it("holds the summary figures behind the loading state", () => {
    mocks.useEvents.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    // Reporting no matched events and no suspicious signals before the request
    // resolves reads as an all-clear on a security surface.
    expect(screen.queryByText("Matched Events")).not.toBeInTheDocument();
    expect(screen.queryByText("Suspicious Signals")).not.toBeInTheDocument();
  });
});

describe("Events actor attribution", () => {
  function withEvents(events: unknown[]) {
    mocks.useEvents.mockReset();
    mocks.useEvents.mockReturnValue({
      data: { events, total: events.length },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  }

  const base = {
    id: "evt-1",
    type: "admin_device_replacement_recovery",
    ip_address: "127.0.0.1",
    user_agent: "agent",
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("names the administrator alongside the target", () => {
    withEvents([
      {
        ...base,
        user_id: "11111111-aaaa-bbbb-cccc-222222222222",
        actor_user_id: "99999999-dddd-eeee-ffff-333333333333",
      },
    ]);

    renderPage();

    expect(screen.getByText("11111111...")).toBeInTheDocument();
    expect(screen.getByText("99999999...")).toBeInTheDocument();
    expect(screen.getByText("Administrative action")).toBeInTheDocument();
  });

  it("leaves an ordinary user event unattributed", () => {
    withEvents([
      {
        ...base,
        type: "login_success",
        user_id: "11111111-aaaa-bbbb-cccc-222222222222",
      },
    ]);

    renderPage();

    expect(screen.getByText("User-linked event")).toBeInTheDocument();
    expect(screen.queryByText("by")).not.toBeInTheDocument();
  });
});
