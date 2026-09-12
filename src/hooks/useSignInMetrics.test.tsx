/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSignInMetrics } from "./useSignInMetrics";

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
  deploymentId: "gen-42",
  attempts: { started: 60, delivered: 20, presented: 55, completed: 48 },
  signIns: { success: 48, failed: 7, successRate: 48 / 55 },
  breakdown: [
    {
      method: "passkey",
      deviceClass: "ios",
      mailProvider: "gmail",
      owner: false,
      success: 40,
      failed: 2,
    },
  ],
};

describe("useSignInMetrics", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("reads the outcomes over all time when no window is given", async () => {
    apiFetch.mockResolvedValue(metrics);

    const { result } = renderHook(() => useSignInMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/internal/metrics/sign-ins");
    expect(result.current.data).toEqual(metrics);
  });

  it("passes the window through as query parameters", async () => {
    apiFetch.mockResolvedValue(metrics);

    const { result } = renderHook(
      () =>
        useSignInMetrics({
          from: "2026-09-01T00:00:00.000Z",
          to: "2026-09-08T00:00:00.000Z",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith(
      "/internal/metrics/sign-ins?from=2026-09-01T00%3A00%3A00.000Z&to=2026-09-08T00%3A00%3A00.000Z",
    );
  });
});
