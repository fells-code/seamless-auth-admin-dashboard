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
});
