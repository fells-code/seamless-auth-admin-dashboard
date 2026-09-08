/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { categorizeEventSummary } from "../lib/eventCategories";
import type { AuthEventSummaryResponse } from "@seamless-auth/types";

export interface GroupedEvents {
  summary: {
    type: string;
    label: string;
    count: number;
  }[];
}

export function useGroupedEvents(params: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const search = query.toString();

  return useQuery({
    queryKey: ["grouped-events", params.from, params.to],
    queryFn: async (): Promise<GroupedEvents> => {
      const data = await apiFetch<AuthEventSummaryResponse>(
        `/internal/auth-events/summary${search ? `?${search}` : ""}`,
      );

      return {
        summary: categorizeEventSummary(data.summary),
      };
    },
    placeholderData: keepPreviousData,
  });
}
