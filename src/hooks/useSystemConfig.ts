/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useSystemConfig.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type SystemConfig = {
  app_name: string;
  available_roles: string[];
  default_roles: string[];
  access_token_ttl: string;
  refresh_token_ttl: string;
  rate_limit: number;
  delay_after: number;
  rpid: string;
  origins: string[];
};

export function useSystemConfig() {
  return useQuery({
    queryKey: ["system-config"],
    queryFn: () => apiFetch<SystemConfig>("/system-config/admin"),
  });
}
