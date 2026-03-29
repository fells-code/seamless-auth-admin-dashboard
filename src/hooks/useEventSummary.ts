/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useEventSummary.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useEventSummary() {
  return useQuery({
    queryKey: ["event-summary"],
    queryFn: () => apiFetch("/internal/auth-events/summary"),
  });
}
