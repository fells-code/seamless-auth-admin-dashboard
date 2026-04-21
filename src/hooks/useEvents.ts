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
  return useQuery({
    queryKey: [
      "events",
      params.limit,
      params.offset,
      params.type?.join(",") ?? "",
      params.from,
      params.to,
    ],
    queryFn: async () => {
      const buildQuery = (type?: string, limit?: number, offset?: number) => {
        const query = new URLSearchParams();

        if (limit !== undefined) query.set("limit", String(limit));
        if (offset !== undefined) query.set("offset", String(offset));
        if (type) query.set("type", type);
        if (params.from) query.set("from", params.from);
        if (params.to) query.set("to", params.to);

        return query.toString();
      };

      const requestedTypes = params.type?.filter(Boolean) ?? [];

      if (requestedTypes.length <= 1) {
        const query = buildQuery(
          requestedTypes[0],
          params.limit,
          params.offset,
        );

        return apiFetch<{ events: AuthEvent[]; total: number }>(
          `/admin/auth-events?${query}`,
        );
      }

      const mergedFetchLimit = (params.offset ?? 0) + (params.limit ?? 20);

      const results = await Promise.all(
        requestedTypes.map((type) =>
          apiFetch<{ events: AuthEvent[]; total: number }>(
            `/admin/auth-events?${buildQuery(type, mergedFetchLimit, 0)}`,
          ),
        ),
      );

      const mergedEvents = results
        .flatMap((result) => result.events)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      return {
        events: mergedEvents.slice(
          params.offset ?? 0,
          (params.offset ?? 0) + (params.limit ?? 20),
        ),
        total: results.reduce((sum, result) => sum + result.total, 0),
      };
    },
  });
}
