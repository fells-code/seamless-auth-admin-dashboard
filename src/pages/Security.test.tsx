/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Security from "./Security";

const mocks = vi.hoisted(() => ({
  useAnomalies: vi.fn(),
  useLoginStats: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../hooks/useAnomalies", () => ({ useAnomalies: mocks.useAnomalies }));
// Covered by its own tests; its hooks need the auth provider this suite does not render.
vi.mock("../components/AuditTrailPanel", () => ({ default: () => null }));
vi.mock("../hooks/useLoginStats", () => ({
  useLoginStats: mocks.useLoginStats,
}));

const suspiciousEvents = [
  {
    id: "event_1",
    type: "login_failed",
    user_id: "user_1",
    ip_address: "10.0.0.1",
    user_agent: "Mozilla/5.0",
    created_at: new Date().toISOString(),
  },
];

function renderPage(initialEntry = "/security") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Security />
    </MemoryRouter>,
  );
}

describe("Security", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset?.());

    mocks.useAnomalies.mockReturnValue({
      data: { suspiciousEvents, total: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
    });
    mocks.useLoginStats.mockReturnValue({
      data: { success: 90, failed: 10, successRate: 0.9 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
    });
  });

  it("defaults the login statistics to a 24 hour window", () => {
    renderPage();

    const bounds = mocks.useLoginStats.mock.calls[0]![0];
    expect(
      new Date(bounds.to).getTime() - new Date(bounds.from).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
  });

  it("reads the window from the URL so a narrowed view is linkable", () => {
    renderPage("/security?range=1h");

    const bounds = mocks.useLoginStats.mock.calls[0]![0];
    expect(
      new Date(bounds.to).getTime() - new Date(bounds.from).getTime(),
    ).toBe(60 * 60 * 1000);
  });

  it("refetches the login statistics for a newly chosen range", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    const bounds = mocks.useLoginStats.mock.lastCall![0];
    expect(
      new Date(bounds.to).getTime() - new Date(bounds.from).getTime(),
    ).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("scopes the login stat cards to the selected window", () => {
    renderPage("/security?range=7d");

    expect(
      screen.getByText("Successful authentication attempts in the last 7 days"),
    ).toBeInTheDocument();
  });

  it("labels the anomaly feed as fixed when the API reports no window", () => {
    // An API that predates ranges ignores the bounds, so the table must not
    // look like it was responding to the picker.
    renderPage();

    expect(screen.getByText(/feed takes no date range/)).toBeInTheDocument();
    expect(
      screen.getByText("Suspicious signals (fixed window)"),
    ).toBeInTheDocument();
  });

  it("asks for the selected range and follows it when the API reports one", () => {
    mocks.useAnomalies.mockReturnValue({
      data: {
        suspiciousEvents,
        total: 1,
        window: {
          from: "2026-03-01T00:00:00.000Z",
          to: "2026-03-02T00:00:00.000Z",
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
    });

    renderPage();

    expect(mocks.useAnomalies).toHaveBeenCalledWith(
      mocks.useLoginStats.mock.calls[0]![0],
    );
    expect(
      screen.queryByText(/feed takes no date range/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Suspicious signals (fixed window)"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/The range below drives every figure on this screen/),
    ).toBeInTheDocument();
  });

  it("renders the anomaly feed and links a flagged user", () => {
    renderPage();

    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "User user_1" })).toHaveAttribute(
      "href",
      "/users/user_1",
    );
  });

  it("renders an empty anomaly feed cleanly", () => {
    mocks.useAnomalies.mockReturnValue({
      data: { suspiciousEvents: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
    });

    renderPage();

    expect(
      screen.getByText("No suspicious activity detected"),
    ).toBeInTheDocument();
  });

  it("surfaces a failed query", () => {
    mocks.useLoginStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("stats exploded"),
      refetch: mocks.refetch,
      isFetching: false,
    });

    renderPage();

    expect(
      screen.getByText("Could not load security signals"),
    ).toBeInTheDocument();
  });
});
