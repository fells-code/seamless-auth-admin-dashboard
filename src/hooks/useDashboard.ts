/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface dashboardData {
  totalUsers: number;
  activeSessions: number;
  newUsers24h: number;

  loginSuccess24h: number;
  loginFailed24h: number;
  successRate24h: number;

  otpUsage24h: number;
  passkeyUsage24h: number;
  databaseSize: number;
}
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<dashboardData>("/internal/metrics/dashboard"),
  });
}
