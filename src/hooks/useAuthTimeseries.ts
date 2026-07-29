/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useAuthTimeseries.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { AuthEventTimeseriesResponse } from "@seamless-auth/types";

export function useAuthTimeseries() {
  return useQuery({
    queryKey: ["auth-timeseries"],
    queryFn: () =>
      apiFetch<AuthEventTimeseriesResponse>(
        "/internal/auth-events/timeseries?interval=hour",
      ),
  });
}
