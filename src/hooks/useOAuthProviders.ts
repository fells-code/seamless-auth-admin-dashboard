/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useOAuthProviders.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { OAuthProviderConfig } from "./useSystemConfig";

const BASE_PATH = "/system-config/oauth-providers";

// The id is immutable and travels in the path, so an update never carries it in
// the body (the API's PATCH schema is strict and rejects it).
export type OAuthProviderUpdate = Partial<Omit<OAuthProviderConfig, "id">>;

type ProviderResponse = { provider: OAuthProviderConfig };

/**
 * Per-provider mutations backed by the dedicated OAuth provider admin routes.
 *
 * These replace editing the whole `oauth_providers` array through the system
 * config patch: each call touches a single provider, so concurrent admin edits
 * no longer clobber the entire list. Every mutation invalidates the system
 * config query so the page re-reads the authoritative provider set.
 */
export function useOAuthProviders() {
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["system-config"] });

  const create = useMutation<ProviderResponse, Error, OAuthProviderConfig>({
    mutationFn: (provider) =>
      apiFetch<ProviderResponse>(BASE_PATH, {
        method: "POST",
        body: JSON.stringify(provider),
      }),
    onSuccess: invalidate,
  });

  const update = useMutation<
    ProviderResponse,
    Error,
    { id: string; updates: OAuthProviderUpdate }
  >({
    mutationFn: ({ id, updates }) =>
      apiFetch<ProviderResponse>(`${BASE_PATH}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation<{ success: true; id: string }, Error, string>({
    mutationFn: (id) =>
      apiFetch<{ success: true; id: string }>(
        `${BASE_PATH}/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
