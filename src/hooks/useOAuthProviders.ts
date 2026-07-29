/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useOAuthProviders.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type {
  OAuthProviderConfig,
  OAuthProviderDeletedResponse,
  OAuthProviderResponse,
  OAuthProviderUpdate,
} from "@seamless-auth/types";

const BASE_PATH = "/system-config/oauth-providers";

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

  const create = useMutation<OAuthProviderResponse, Error, OAuthProviderConfig>(
    {
      mutationFn: (provider) =>
        apiFetch<OAuthProviderResponse>(BASE_PATH, {
          method: "POST",
          body: JSON.stringify(provider),
        }),
      onSuccess: invalidate,
    },
  );

  const update = useMutation<
    OAuthProviderResponse,
    Error,
    { id: string; updates: OAuthProviderUpdate }
  >({
    mutationFn: ({ id, updates }) =>
      apiFetch<OAuthProviderResponse>(
        `${BASE_PATH}/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        },
      ),
    onSuccess: invalidate,
  });

  const remove = useMutation<OAuthProviderDeletedResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<OAuthProviderDeletedResponse>(
        `${BASE_PATH}/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
