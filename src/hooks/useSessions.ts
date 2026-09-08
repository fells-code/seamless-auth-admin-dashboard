/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useSessions.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { SessionListResponse } from "@seamless-auth/types";

export function useSessions(params: { limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();

  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));

  const search = query.toString();

  return useQuery({
    // GET /admin/sessions applies a limit of 50 when none is sent, so calling
    // it bare returned a capped page that the screen then presented as the
    // whole deployment. The window is now explicit and part of the key.
    queryKey: ["sessions", params.limit, params.offset],
    queryFn: () =>
      apiFetch<SessionListResponse>(
        `/admin/sessions${search ? `?${search}` : ""}`,
      ),
    // Paging changes the query key. Without this the screen would drop to its
    // full-page skeleton on every Next, losing the search box and the filter
    // selection mid-investigation.
    placeholderData: keepPreviousData,
    // The monitoring screens describe themselves as live, so revalidate on an
    // interval and when the operator returns to the tab. Manual refresh stays
    // available for anything more immediate.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
