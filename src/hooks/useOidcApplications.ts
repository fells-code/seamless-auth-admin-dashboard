/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type {
  MessageResponse,
  OidcApplicationCreatedResponse,
  OidcApplicationCreateRequest,
  OidcApplicationKeysRequest,
  OidcApplicationListResponse,
  OidcApplicationResourceGrant,
  OidcApplicationResourcesResponse,
  OidcApplicationResponse,
  OidcApplicationSecretResponse,
  OidcApplicationUpdateRequest,
} from "@seamless-auth/types";

function applicationPath(id: string) {
  return `/admin/applications/${encodeURIComponent(id)}`;
}

export function useOidcApplications() {
  return useQuery({
    queryKey: ["oidc-applications"],
    queryFn: () => apiFetch<OidcApplicationListResponse>("/admin/applications"),
  });
}

export function useCreateOidcApplication() {
  const qc = useQueryClient();

  return useMutation<
    OidcApplicationCreatedResponse,
    Error,
    OidcApplicationCreateRequest
  >({
    mutationFn: (data) =>
      apiFetch<OidcApplicationCreatedResponse>("/admin/applications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oidc-applications"] });
    },
  });
}

export function useUpdateOidcApplication() {
  const qc = useQueryClient();

  return useMutation<
    OidcApplicationResponse,
    Error,
    OidcApplicationUpdateRequest & { id: string }
  >({
    mutationFn: ({ id, ...data }) =>
      apiFetch<OidcApplicationResponse>(applicationPath(id), {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oidc-applications"] });
    },
  });
}

export function useDeleteOidcApplication() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<MessageResponse>(applicationPath(id), { method: "DELETE" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["oidc-applications"] });
      qc.removeQueries({ queryKey: ["oidc-application-resources", id] });
    },
  });
}

export function useRotateOidcApplicationSecret() {
  const qc = useQueryClient();

  return useMutation<OidcApplicationSecretResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<OidcApplicationSecretResponse>(`${applicationPath(id)}/secret`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oidc-applications"] });
    },
  });
}

export function useSetOidcApplicationKeys() {
  const qc = useQueryClient();

  return useMutation<
    OidcApplicationResponse,
    Error,
    OidcApplicationKeysRequest & { id: string }
  >({
    mutationFn: ({ id, ...data }) =>
      apiFetch<OidcApplicationResponse>(`${applicationPath(id)}/keys`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oidc-applications"] });
    },
  });
}

export function useOidcApplicationResources(id?: string | null) {
  return useQuery({
    queryKey: ["oidc-application-resources", id],
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) throw new Error("Application ID is required");

      return apiFetch<OidcApplicationResourcesResponse>(
        `${applicationPath(id)}/resources`,
      );
    },
  });
}

export function useSetOidcApplicationResources() {
  const qc = useQueryClient();

  return useMutation<
    OidcApplicationResourcesResponse,
    Error,
    { id: string; resources: OidcApplicationResourceGrant[] }
  >({
    mutationFn: ({ id, resources }) =>
      apiFetch<OidcApplicationResourcesResponse>(
        `${applicationPath(id)}/resources`,
        { method: "PUT", body: JSON.stringify({ resources }) },
      ),
    onSuccess: (data, { id }) => {
      qc.setQueryData(["oidc-application-resources", id], data);
    },
  });
}
