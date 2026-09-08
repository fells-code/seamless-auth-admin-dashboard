/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useLoginStats.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { LoginStatsResponse } from "@seamless-auth/types";

export function useLoginStats(params: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const search = query.toString();

  return useQuery({
    queryKey: ["loginStats", params.from, params.to],
    queryFn: () =>
      apiFetch<LoginStatsResponse>(
        `/internal/auth-events/login-stats${search ? `?${search}` : ""}`,
      ),
    placeholderData: keepPreviousData,
    // The monitoring screens describe themselves as live, so revalidate on an
    // interval and when the operator returns to the tab. Manual refresh stays
    // available for anything more immediate.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
