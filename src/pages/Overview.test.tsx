/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Overview from "./Overview";

const mocks = vi.hoisted(() => ({
  useDashboard: vi.fn(),
  useAuthTimeseries: vi.fn(),
  useGroupedEvents: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../hooks/useDashboard", () => ({ useDashboard: mocks.useDashboard }));
vi.mock("../hooks/useAuthTimeseries", () => ({
  useAuthTimeseries: mocks.useAuthTimeseries,
}));
vi.mock("../hooks/useGroupedEvents", () => ({
  useGroupedEvents: mocks.useGroupedEvents,
}));

// Recharts measures its container, which jsdom reports as zero, so the charts
// render nothing useful and only get in the way of these assertions.
vi.mock("../components/LineChart", () => ({
  default: () => <div data-testid="line-chart" />,
}));
vi.mock("../components/PieChart", () => ({
  default: () => <div data-testid="pie-chart" />,
}));

const dashboard = {
  totalUsers: 40,
  newUsers24h: 3,
  activeSessions: 12,
  databaseSize: 1024,
  loginSuccess24h: 90,
  loginFailed24h: 10,
  successRate24h: 0.9,
  passkeyUsage24h: 55,
};

function renderPage(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Overview />
    </MemoryRouter>,
  );
}

describe("Overview", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset?.());

    mocks.useDashboard.mockReturnValue({
      data: dashboard,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: Date.now(),
    });
    mocks.useAuthTimeseries.mockReturnValue({
      data: {
        timeseries: [{ bucket: "2026-01-01T00:00:00Z", success: 5, failed: 1 }],
      },
      isError: false,
      error: null,
      refetch: mocks.refetch,
    });
    mocks.useGroupedEvents.mockReturnValue({
      data: { summary: [{ type: "security", label: "Security", count: 4 }] },
      isError: false,
      error: null,
      refetch: mocks.refetch,
    });
  });

  it("defaults the charts to a 24 hour window bucketed by hour", () => {
    renderPage();

    expect(mocks.useAuthTimeseries).toHaveBeenCalledWith(
      expect.objectContaining({ interval: "hour" }),
    );

    const bounds = mocks.useAuthTimeseries.mock.calls[0]![0];
    expect(
      new Date(bounds.to).getTime() - new Date(bounds.from).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
    expect(mocks.useGroupedEvents).toHaveBeenCalledWith({
      from: bounds.from,
      to: bounds.to,
    });
  });

  it("reads the window from the URL so a narrowed view is linkable", () => {
    renderPage("/?range=7d");

    const bounds = mocks.useAuthTimeseries.mock.calls[0]![0];
    expect(
      new Date(bounds.to).getTime() - new Date(bounds.from).getTime(),
    ).toBe(7 * 24 * 60 * 60 * 1000);

    // Hourly buckets over a week are 168 points of noise on a chart sized for
    // a day.
    expect(bounds.interval).toBe("day");
  });

  it("puts the chosen range in the URL", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "1h" }));

    const bounds = mocks.useAuthTimeseries.mock.lastCall![0];
    expect(
      new Date(bounds.to).getTime() - new Date(bounds.from).getTime(),
    ).toBe(60 * 60 * 1000);
  });

  it("says the deployment metrics do not follow the range selector", () => {
    // /internal/metrics/dashboard takes no parameters, so these tiles would
    // otherwise look like they were responding to the picker.
    renderPage();

    expect(
      screen.getByText(/Deployment metrics cover a fixed 24-hour window/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("24h auth attempts (fixed window)"),
    ).toBeInTheDocument();
  });

  it("scopes the chart copy to the selected window", () => {
    renderPage("/?range=7d");

    expect(
      screen.getByText(/across the last 7 days, bucketed by day/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The highest-volume auth events across the last 7 days.",
      ),
    ).toBeInTheDocument();
  });

  it("surfaces a failed chart query without taking down the page", () => {
    mocks.useAuthTimeseries.mockReturnValue({
      data: undefined,
      isError: true,
      error: new Error("timeseries exploded"),
      refetch: mocks.refetch,
    });

    renderPage();

    expect(screen.getByText("Login activity unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("shows the dashboard error state when the metrics query fails", () => {
    mocks.useDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("metrics exploded"),
      refetch: mocks.refetch,
      isFetching: false,
      dataUpdatedAt: 0,
    });

    renderPage();

    expect(
      screen.getByText("Could not load overview metrics"),
    ).toBeInTheDocument();
  });
});
