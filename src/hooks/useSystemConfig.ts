/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useSystemConfig.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { GetSystemConfigResponse } from "@seamless-auth/types";

export function useSystemConfig() {
  return useQuery({
    queryKey: ["system-config"],
    queryFn: () => apiFetch<GetSystemConfigResponse>("/system-config/admin"),
  });
}
