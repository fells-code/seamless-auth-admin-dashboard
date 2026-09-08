/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessions } from "./useSessions";

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

describe("useSessions", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({ sessions: [], total: 0 });
  });

  it("asks for the requested window", async () => {
    const { result } = renderHook(
      () => useSessions({ limit: 50, offset: 50 }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/sessions?limit=50&offset=50");
  });

  it("omits a zero offset so the API applies its own default", async () => {
    const { result } = renderHook(() => useSessions({ limit: 50, offset: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/sessions?limit=50");
  });

  it("requests the bare endpoint when no window is given", async () => {
    const { result } = renderHook(() => useSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/sessions");
  });

  it("keeps the loaded page on screen while the next one loads", async () => {
    let resolveSecond: ((value: unknown) => void) | undefined;

    apiFetch
      .mockResolvedValueOnce({ sessions: [{ id: "session_1" }], total: 137 })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { result, rerender } = renderHook(
      ({ offset }) => useSessions({ limit: 50, offset }),
      { wrapper: createWrapper(), initialProps: { offset: 0 } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // A new page key would otherwise drop the screen back to its skeleton,
    // discarding the search box and the selected activity filter.
    rerender({ offset: 50 });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({
      sessions: [{ id: "session_1" }],
      total: 137,
    });

    resolveSecond?.({ sessions: [{ id: "session_51" }], total: 137 });

    await waitFor(() =>
      expect(result.current.data).toEqual({
        sessions: [{ id: "session_51" }],
        total: 137,
      }),
    );
  });
});
