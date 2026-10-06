/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEnrollment, useSendEnrollmentInvites } from "./useEnrollment";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  apiFetch,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const emptyResponse = {
  summary: { total: 0, none: 0, one: 0, twoOrMore: 0 },
  users: [],
  total: 0,
};

beforeEach(() => {
  apiFetch.mockReset();
});

describe("useEnrollment", () => {
  it("lists enrollment with no filters", async () => {
    apiFetch.mockResolvedValue(emptyResponse);

    const { result } = renderHook(() => useEnrollment(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/enrollment");
  });

  it("sends every filter it is given", async () => {
    apiFetch.mockResolvedValue(emptyResponse);

    const { result } = renderHook(
      () =>
        useEnrollment({
          limit: 50,
          offset: 100,
          organizationId: "org-1",
          status: "none",
          imported: true,
          search: " ada ",
        }),
      { wrapper: createWrapper(createQueryClient()) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/enrollment?limit=50&offset=100&organizationId=org-1&status=none&imported=true&search=ada",
    );
  });

  it("omits a search term that is only whitespace", async () => {
    apiFetch.mockResolvedValue(emptyResponse);

    const { result } = renderHook(
      () => useEnrollment({ limit: 50, search: "   " }),
      { wrapper: createWrapper(createQueryClient()) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/enrollment?limit=50");
  });

  it("refetches when a filter changes", async () => {
    apiFetch.mockResolvedValue(emptyResponse);

    const { result, rerender } = renderHook(
      ({ status }: { status?: "none" | "one" }) =>
        useEnrollment({ limit: 50, status }),
      {
        wrapper: createWrapper(createQueryClient()),
        initialProps: {},
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ status: "one" });

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/admin/enrollment?limit=50&status=one",
      ),
    );
  });
});

describe("useSendEnrollmentInvites", () => {
  it("posts the invite and refreshes enrollment", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockResolvedValue({ sent: 1, skipped: 0, results: [] });
    const { result } = renderHook(() => useSendEnrollmentInvites(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ organizationId: "org-1" });
    });

    expect(apiFetch).toHaveBeenCalledWith("/admin/enrollment/invites", {
      method: "POST",
      body: JSON.stringify({ organizationId: "org-1" }),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["enrollment"],
    });
  });

  it("does not refresh anything when the send fails", async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    apiFetch.mockRejectedValue(new Error("Passkey only sign-in"));
    const { result } = renderHook(() => useSendEnrollmentInvites(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ userIds: ["user-1"] }),
      ).rejects.toThrow("Passkey only sign-in");
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
