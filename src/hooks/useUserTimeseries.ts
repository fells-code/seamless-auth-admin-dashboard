/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface TimeSeriesData {
  bucket: string;
  success: number;
  failed: number;
}
export function useUserTimeseries(userId: string) {
  return useQuery({
    queryKey: ["user-timeseries", userId],
    queryFn: () =>
      apiFetch<{ timeseries: TimeSeriesData[] }>(
        `/internal/auth-events/timeseries?interval=hour&userId=${userId}`,
      ),
    enabled: !!userId,
  });
}
