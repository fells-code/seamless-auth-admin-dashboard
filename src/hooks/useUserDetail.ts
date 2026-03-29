/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { UserDetailResponse } from "../types/user";

export function useUserDetail(userId: string) {
  return useQuery<UserDetailResponse>({
    queryKey: ["user-detail", userId],
    queryFn: () => apiFetch(`/admin/users/${userId}`),
    enabled: !!userId,
  });
}
