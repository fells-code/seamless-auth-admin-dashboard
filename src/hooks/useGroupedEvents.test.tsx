/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGroupedEvents } from "./useGroupedEvents";
import { categorizeEventSummary } from "../lib/eventCategories";

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

describe("useGroupedEvents", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("categorizes the raw event summary before returning it", async () => {
    const summary = [
      { type: "login_success", count: 12 },
      { type: "login_failed", count: 3 },
    ];
    apiFetch.mockResolvedValue({ summary });

    const { result } = renderHook(() => useGroupedEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/internal/auth-events/summary");
    // The hook's job is to run the summary through the shared categorizer, so
    // assert against that rather than restating its labelling rules here.
    expect(result.current.data).toEqual({
      summary: categorizeEventSummary(summary),
    });
  });

  it("handles an empty summary", async () => {
    apiFetch.mockResolvedValue({ summary: [] });

    const { result } = renderHook(() => useGroupedEvents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      summary: categorizeEventSummary([]),
    });
  });
});
