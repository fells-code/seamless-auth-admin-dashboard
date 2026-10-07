/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { DashboardMetricsResponse } from "@seamless-auth/types";

export interface DashboardFigures {
  /** True when the figures cover the requested range, false when they are the fixed 24 hours. */
  ranged: boolean;
  newUsers: number;
  loginSuccess: number;
  loginFailed: number;
  successRate: number;
  passkeyUsage: number;
}

/**
 * The figures that follow the range when the API reports them, and the fixed 24-hour
 * ones from an API that predates ranges. The page labels them by `ranged`, so a tile
 * never claims to follow the range selector while showing a fixed window.
 */
export function dashboardFigures(
  data: DashboardMetricsResponse | undefined,
): DashboardFigures {
  if (data?.window && data.loginSuccess !== undefined) {
    return {
      ranged: true,
      newUsers: data.newUsers ?? 0,
      loginSuccess: data.loginSuccess,
      loginFailed: data.loginFailed ?? 0,
      successRate: data.successRate ?? 0,
      passkeyUsage: data.passkeyUsage ?? 0,
    };
  }

  return {
    ranged: false,
    newUsers: data?.newUsers24h ?? 0,
    loginSuccess: data?.loginSuccess24h ?? 0,
    loginFailed: data?.loginFailed24h ?? 0,
    successRate: data?.successRate24h ?? 0,
    passkeyUsage: data?.passkeyUsage24h ?? 0,
  };
}
