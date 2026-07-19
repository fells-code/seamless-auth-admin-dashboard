/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUserDetail } from "./useUserDetail";
import { useUserAnomalies } from "./useUserAnomalies";
import { useUserTimeseries } from "./useUserTimeseries";

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

// Both hooks are gated on a user id so they do not fire while a route param is
// still resolving.
const userScopedHooks = [
  {
    name: "useUserDetail",
    use: useUserDetail,
    path: "/admin/users/user_1",
  },
  {
    name: "useUserAnomalies",
    use: useUserAnomalies,
    path: "/admin/users/user_1/anomalies",
  },
  {
    name: "useUserTimeseries",
    use: useUserTimeseries,
    path: "/internal/auth-events/timeseries?interval=hour&userId=user_1",
  },
];

describe.each(userScopedHooks)("$name", ({ use, path }) => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({});
  });

  it("requests the user-scoped endpoint", async () => {
    const { result } = renderHook(() => use("user_1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith(path);
  });

  it("stays idle until a user id is available", () => {
    const { result } = renderHook(() => use(""), {
      wrapper: createWrapper(),
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });
});
