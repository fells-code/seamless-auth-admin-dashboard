/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useAnomalies.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { AuthEvent } from "@seamless-auth/types";

export type AuthEventPartial = Partial<
  Pick<
    AuthEvent,
    "user_id" | "type" | "ip_address" | "user_agent" | "metadata" | "created_at"
  >
>;

export interface SuspiousIp {
  ip: string;
  count: number;
}
export interface Anomalies {
  suspiciousEvents: AuthEventPartial[];
  total: number;
}

export function useAnomalies() {
  return useQuery({
    queryKey: ["anomalies"],
    queryFn: () => apiFetch<Anomalies>("/internal/security/anomalies"),
  });
}
