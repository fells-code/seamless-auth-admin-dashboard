/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import {
  useAddOidcApplicationLink,
  useDeleteOidcApplication,
  useOidcApplicationLinks,
  useRemoveOidcApplicationLink,
} from "./useOidcApplications";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", async (importActual) => ({
  ...(await importActual<typeof import("../lib/api")>()),
  apiFetch,
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidate,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
});

describe("application links", () => {
  it("reads the links of an application", async () => {
    apiFetch.mockResolvedValue({ links: [], linkedFrom: [] });
    const { result } = renderHook(() => useOidcApplicationLinks("app/1"), {
      wrapper: setup().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiFetch).toHaveBeenCalledWith("/admin/applications/app%2F1/links");
  });

  it("does not read without an application", () => {
    renderHook(() => useOidcApplicationLinks(null), {
      wrapper: setup().wrapper,
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  // A 404 means the API predates links. Retrying held the panel on its
  // skeleton before it could say so.
  it("does not retry a 404", async () => {
    apiFetch.mockRejectedValue(new ApiError("Not found", 404));
    const { result } = renderHook(() => useOidcApplicationLinks("backend"), {
      wrapper: setup().wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("adds a link and refreshes both ends", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAddOidcApplicationLink(), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({
        clientId: "backend",
        linkedClientId: "desk",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/applications/backend/links/desk",
      { method: "PUT" },
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["oidc-application-links"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["oidc-applications"],
    });
  });

  it("removes a link", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useRemoveOidcApplicationLink(), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({
        clientId: "backend",
        linkedClientId: "desk",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/applications/backend/links/desk",
      { method: "DELETE" },
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["oidc-application-links"],
    });
  });

  it("drops the links of a deleted application", async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDeleteOidcApplication(), {
      wrapper,
    });

    await act(() => result.current.mutateAsync("backend"));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["oidc-application-links"],
    });
  });
});
