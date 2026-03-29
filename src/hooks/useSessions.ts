/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useSessions.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Session } from "../types/user";

export interface SessionRespons {
  total: number;
  sessions: Session[];
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiFetch<SessionRespons>("/admin/sessions"),
  });
}
