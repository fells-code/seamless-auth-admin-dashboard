/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAnomalies } from "./useAnomalies";
import { useAuthTimeseries } from "./useAuthTimeseries";
import { useDashboard } from "./useDashboard";
import { useEventSummary } from "./useEventSummary";
import { useLoginStats } from "./useLoginStats";
import { useRoles } from "./useRoles";
import { useSessions } from "./useSessions";
import { useSystemConfig } from "./useSystemConfig";

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

// These hooks take no arguments, so the contract worth pinning is simply which
// endpoint each one calls.
const fixedEndpointHooks = [
  { name: "useSessions", use: useSessions, path: "/admin/sessions" },
  { name: "useRoles", use: useRoles, path: "/system-config/roles" },
  {
    name: "useDashboard",
    use: useDashboard,
    path: "/internal/metrics/dashboard",
  },
  {
    name: "useAuthTimeseries",
    use: useAuthTimeseries,
    path: "/internal/auth-events/timeseries?interval=hour",
  },
  {
    name: "useSystemConfig",
    use: useSystemConfig,
    path: "/system-config/admin",
  },
  {
    name: "useAnomalies",
    use: useAnomalies,
    path: "/internal/security/anomalies",
  },
  {
    name: "useEventSummary",
    use: useEventSummary,
    path: "/internal/auth-events/summary",
  },
  {
    name: "useLoginStats",
    use: useLoginStats,
    path: "/internal/auth-events/login-stats",
  },
];

describe.each(fixedEndpointHooks)("$name", ({ use, path }) => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({});
  });

  it("requests its endpoint", async () => {
    const { result } = renderHook(() => use(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetch).toHaveBeenCalledWith(path);
  });

  it("exposes the failure to the caller", async () => {
    apiFetch.mockRejectedValue(new Error("The request was invalid."));

    const { result } = renderHook(() => use(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
