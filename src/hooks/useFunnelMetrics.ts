/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface IntervalStats {
  /** How many readings the percentiles were computed over. */
  count: number;
  /** Null when `count` is zero. */
  medianSeconds: number | null;
  p90Seconds: number | null;
}

// Mirrors FunnelMetricsResponseSchema in seamless-auth-api. It is not in
// @seamless-auth/types yet, so the shape lives here until that package picks
// it up.
export interface FunnelMetricsResponse {
  timeToRegistration: IntervalStats;
  timeToLogin: IntervalStats;
  passkeyAdoption: {
    users: number;
    withPasskey: number;
    rate: number;
  };
  timeToFirstPasskey: IntervalStats;
}

export function useFunnelMetrics(params: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const search = query.toString();

  return useQuery({
    queryKey: ["funnelMetrics", params.from, params.to],
    queryFn: () =>
      apiFetch<FunnelMetricsResponse>(
        `/internal/metrics/funnel${search ? `?${search}` : ""}`,
      ),
    placeholderData: keepPreviousData,
    // The monitoring screens describe themselves as live, so revalidate on an
    // interval and when the operator returns to the tab. Manual refresh stays
    // available for anything more immediate.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
