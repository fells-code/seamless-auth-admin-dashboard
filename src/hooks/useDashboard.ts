/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { DashboardMetricsResponse } from "@seamless-auth/types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      apiFetch<DashboardMetricsResponse>("/internal/metrics/dashboard"),
  });
}
