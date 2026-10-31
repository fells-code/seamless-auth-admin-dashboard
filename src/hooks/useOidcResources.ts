/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type {
  MessageResponse,
  OidcResourceCreateRequest,
  OidcResourceListResponse,
  OidcResourceResponse,
  OidcResourceUpdateRequest,
} from "@seamless-auth/types";

export function useOidcResources() {
  return useQuery({
    queryKey: ["oidc-resources"],
    queryFn: () => apiFetch<OidcResourceListResponse>("/admin/resources"),
  });
}

export function useCreateOidcResource() {
  const qc = useQueryClient();

  return useMutation<OidcResourceResponse, Error, OidcResourceCreateRequest>({
    mutationFn: (data) =>
      apiFetch<OidcResourceResponse>("/admin/resources", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oidc-resources"] });
    },
  });
}

export function useUpdateOidcResource() {
  const qc = useQueryClient();

  return useMutation<
    OidcResourceResponse,
    Error,
    OidcResourceUpdateRequest & { id: string }
  >({
    mutationFn: ({ id, ...data }) =>
      apiFetch<OidcResourceResponse>(`/admin/resources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    // Removing a scope also removes it from every application allowed it.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oidc-resources"] });
      qc.invalidateQueries({ queryKey: ["oidc-application-resources"] });
    },
  });
}

export function useDeleteOidcResource() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<MessageResponse>(`/admin/resources/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oidc-resources"] });
      qc.invalidateQueries({ queryKey: ["oidc-application-resources"] });
    },
  });
}
