/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useAuthTimeseries.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { AuthEventTimeseriesResponse } from "@seamless-auth/types";

export function useAuthTimeseries(
  params: { from?: string; to?: string; interval?: "hour" | "day" } = {},
) {
  const interval = params.interval ?? "hour";
  const query = new URLSearchParams({ interval });

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  return useQuery({
    queryKey: ["auth-timeseries", interval, params.from, params.to],
    queryFn: () =>
      apiFetch<AuthEventTimeseriesResponse>(
        `/internal/auth-events/timeseries?${query}`,
      ),
    // Narrowing the window changes the key, and dropping to a skeleton on every
    // range click makes the chart flicker rather than move.
    placeholderData: keepPreviousData,
  });
}
