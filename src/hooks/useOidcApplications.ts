/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { shouldRetryQuery } from "../lib/queryRetry";
import { isRouteMissing } from "../lib/roleRefusals";
import type {
  ApplicationCreateBody,
  ApplicationUpdateBody,
  OidcApplicationLink,
  OidcApplicationLinksResponse,
  OidcApplicationListView,
} from "../lib/oidcApplications";
import type {
  MessageResponse,
  OidcApplicationCreatedResponse,
  OidcApplicationKeysRequest,
  OidcApplicationResourceGrant,
  OidcApplicationResourcesResponse,
  OidcApplicationResponse,
  OidcApplicationSecretResponse,
} from "@seamless-auth/types";

function applicationPath(id: string) {
  return `/admin/applications/${encodeURIComponent(id)}`;
}

export function useOidcApplications() {
  return useQuery({
    queryKey: ["oidc-applications"],
    queryFn: () => apiFetch<OidcApplicationListView>("/admin/applications"),
  });
}

export function useCreateOidcApplication() {
  const qc = useQueryClient();

  return useMutation<
    OidcApplicationCreatedResponse,
    Error,
    ApplicationCreateBody
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
    ApplicationUpdateBody & { id: string }
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
      // Deleting an application removes its links in both directions.
      qc.invalidateQueries({ queryKey: ["oidc-application-links"] });
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

// A 404 on an application already listed means the API predates links (v0.23).
// Retrying cannot change that.
function retryUnlessMissing(failureCount: number, error: unknown) {
  return !isRouteMissing(error) && shouldRetryQuery(failureCount, error);
}

export function useOidcApplicationLinks(id?: string | null) {
  return useQuery({
    queryKey: ["oidc-application-links", id],
    enabled: Boolean(id),
    retry: retryUnlessMissing,
    queryFn: () => {
      if (!id) throw new Error("Application ID is required");

      return apiFetch<OidcApplicationLinksResponse>(
        `${applicationPath(id)}/links`,
      );
    },
  });
}

type LinkTarget = { clientId: string; linkedClientId: string };

function linkPath({ clientId, linkedClientId }: LinkTarget) {
  return `${applicationPath(clientId)}/links/${encodeURIComponent(linkedClientId)}`;
}

function useInvalidateLinks() {
  const qc = useQueryClient();

  // Both ends list the link, and every application response carries it.
  return () => {
    qc.invalidateQueries({ queryKey: ["oidc-application-links"] });
    qc.invalidateQueries({ queryKey: ["oidc-applications"] });
  };
}

export function useAddOidcApplicationLink() {
  const invalidate = useInvalidateLinks();

  return useMutation<{ link: OidcApplicationLink }, Error, LinkTarget>({
    mutationFn: (target) =>
      apiFetch<{ link: OidcApplicationLink }>(linkPath(target), {
        method: "PUT",
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveOidcApplicationLink() {
  const invalidate = useInvalidateLinks();

  return useMutation<MessageResponse, Error, LinkTarget>({
    mutationFn: (target) =>
      apiFetch<MessageResponse>(linkPath(target), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
