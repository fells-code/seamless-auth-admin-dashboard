/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { UserAnomalies } from "../types/user";

export function useUserAnomalies(userId: string) {
  return useQuery<UserAnomalies>({
    queryKey: ["user-anomalies", userId],
    queryFn: () => apiFetch(`/admin/users/${userId}/anomalies`),
    enabled: !!userId,
  });
}
