/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useEvents.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { AuthEvent } from "@seamless-auth/types";

export function useEvents(params: {
  limit?: number;
  offset?: number;
  type?: string[];
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();

  if (params.limit !== undefined) query.set("limit", String(params.limit));

  if (params.offset !== undefined) query.set("offset", String(params.offset));

  if (params.type && params.type.length > 0) {
    params.type.forEach((t) => query.append("type", t));
  }

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  return useQuery({
    queryKey: [
      "events",
      params.limit,
      params.offset,
      params.type?.join(",") ?? "",
      params.from,
      params.to,
    ],
    queryFn: () =>
      apiFetch<{ events: AuthEvent[]; total: number }>(
        `/admin/auth-events?${query.toString()}`,
      ),
  });
}
