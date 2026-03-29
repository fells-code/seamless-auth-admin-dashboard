/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useUsers.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type User = {
  id: string;
  email: string;
  phone?: string;
  roles: string[];
  verified: boolean;
  lastLogin?: string;
};

export function useUsers(params: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();

  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (params.search) query.set("search", params.search);

  return useQuery({
    queryKey: ["users", params],
    queryFn: () =>
      apiFetch<{ users: User[]; total: number }>(`/admin/users?${query}`),
  });
}
