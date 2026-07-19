/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUsers } from "./useUsers";

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

describe("useUsers", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({ users: [], total: 0 });
  });

  it("builds the query string from paging and search params", async () => {
    const { result } = renderHook(
      () => useUsers({ limit: 25, offset: 50, search: "ada" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/users?limit=25&offset=50&search=ada",
    );
  });

  it("omits zero and empty values so defaults are left to the API", async () => {
    const { result } = renderHook(
      () => useUsers({ limit: 25, offset: 0, search: "" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/users?limit=25");
  });

  it("requests without params when none are supplied", async () => {
    const { result } = renderHook(() => useUsers({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/users?");
  });

  it("encodes search terms with special characters", async () => {
    const { result } = renderHook(() => useUsers({ search: "a d@e.com" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith("/admin/users?search=a+d%40e.com");
  });
});
