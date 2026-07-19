/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEvents } from "./useEvents";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  apiFetch,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function requestedPaths() {
  return apiFetch.mock.calls.map((call) => String(call[0]));
}

describe("useEvents", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("issues a single request when no type filter is applied", async () => {
    apiFetch.mockResolvedValue({ events: [], total: 0 });

    const { result } = renderHook(() => useEvents({ limit: 20, offset: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(requestedPaths()[0]).toBe("/admin/auth-events?limit=20&offset=0");
  });

  it("passes a single type and the date range through as query params", async () => {
    apiFetch.mockResolvedValue({ events: [], total: 0 });

    const { result } = renderHook(
      () =>
        useEvents({
          limit: 10,
          offset: 0,
          type: ["login_success"],
          from: "2026-01-01",
          to: "2026-01-31",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(requestedPaths()[0]).toBe(
      "/admin/auth-events?limit=10&offset=0&type=login_success&from=2026-01-01&to=2026-01-31",
    );
  });

  it("merges, sorts, and paginates when several types are requested", async () => {
    apiFetch.mockImplementation((path: string) => {
      if (path.includes("type=alpha")) {
        return Promise.resolve({
          events: [
            { id: "a1", created_at: "2026-01-03T00:00:00Z" },
            { id: "a2", created_at: "2026-01-01T00:00:00Z" },
          ],
          total: 2,
        });
      }

      return Promise.resolve({
        events: [
          { id: "b1", created_at: "2026-01-04T00:00:00Z" },
          { id: "b2", created_at: "2026-01-02T00:00:00Z" },
        ],
        total: 3,
      });
    });

    const { result } = renderHook(
      () => useEvents({ limit: 2, offset: 1, type: ["alpha", "beta"] }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // One request per type, each fetching offset + limit rows from the start so
    // the merged list can be paginated locally.
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(requestedPaths()).toEqual([
      "/admin/auth-events?limit=3&offset=0&type=alpha",
      "/admin/auth-events?limit=3&offset=0&type=beta",
    ]);

    // Newest first across both types, then sliced to the requested page.
    expect(result.current.data?.events.map((event) => event.id)).toEqual([
      "a1",
      "b2",
    ]);
    expect(result.current.data?.total).toBe(5);
  });

  it("ignores empty type entries when deciding how many requests to make", async () => {
    apiFetch.mockResolvedValue({ events: [], total: 0 });

    const { result } = renderHook(
      () => useEvents({ limit: 5, offset: 0, type: ["", "login_success"] }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(requestedPaths()[0]).toBe(
      "/admin/auth-events?limit=5&offset=0&type=login_success",
    );
  });
});
