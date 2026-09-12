/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFunnelMetrics } from "./useFunnelMetrics";

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

const metrics = {
  timeToRegistration: { count: 3, medianSeconds: 90, p90Seconds: 258 },
  timeToLogin: { count: 2, medianSeconds: 25, p90Seconds: 29 },
  passkeyAdoption: { users: 5, withPasskey: 3, rate: 0.6 },
  timeToFirstPasskey: { count: 3, medianSeconds: 86400, p90Seconds: 86400 },
};

describe("useFunnelMetrics", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("reads the funnel over all time when no window is given", async () => {
    apiFetch.mockResolvedValue(metrics);

    const { result } = renderHook(() => useFunnelMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/internal/metrics/funnel");
    expect(result.current.data).toEqual(metrics);
  });

  it("passes the window through as query parameters", async () => {
    apiFetch.mockResolvedValue(metrics);

    const { result } = renderHook(
      () =>
        useFunnelMetrics({
          from: "2026-09-01T00:00:00.000Z",
          to: "2026-09-08T00:00:00.000Z",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith(
      "/internal/metrics/funnel?from=2026-09-01T00%3A00%3A00.000Z&to=2026-09-08T00%3A00%3A00.000Z",
    );
  });
});
