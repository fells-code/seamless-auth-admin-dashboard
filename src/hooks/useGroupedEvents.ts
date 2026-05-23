/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { categorizeEventSummary } from "../lib/eventCategories";

type EventSummaryResponse = {
  summary: {
    type: string;
    count: number;
  }[];
};

export interface GroupedEvents {
  summary: {
    type: string;
    label: string;
    count: number;
  }[];
}

export function useGroupedEvents() {
  return useQuery({
    queryKey: ["grouped-events"],
    queryFn: async (): Promise<GroupedEvents> => {
      const data = await apiFetch<EventSummaryResponse>(
        "/internal/auth-events/summary",
      );

      return {
        summary: categorizeEventSummary(data.summary),
      };
    },
  });
}
