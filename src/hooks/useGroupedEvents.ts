/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface groupedEvents {
  summary: {
    type: string;
    count: number;
  }[];
}
export function useGroupedEvents() {
  return useQuery({
    queryKey: ["grouped-events"],
    queryFn: () => apiFetch<groupedEvents>("/internal/auth-events/grouped"),
  });
}
