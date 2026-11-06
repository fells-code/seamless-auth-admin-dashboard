/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateOrganizationRoleRequest,
  CreatePermissionRequest,
  MessageResponse,
  PermissionEnvelopeResponse,
  PermissionListResponse,
  RoleEnvelopeResponse,
  RoleKind,
  RoleListResponse,
} from "@seamless-auth/types";
import { apiFetch } from "../lib/api";
import { shouldRetryQuery } from "../lib/queryRetry";
import { isRouteMissing } from "../lib/roleRefusals";

// A 404 here means the API predates these routes. Retrying cannot change that,
// and held the page on its skeleton before saying so.
function retryUnlessMissing(failureCount: number, error: unknown) {
  return !isRouteMissing(error) && shouldRetryQuery(failureCount, error);
}

// Legacy organization role names can contain spaces.
const segment = encodeURIComponent;

export function usePermissionCatalogue() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => apiFetch<PermissionListResponse>("/admin/permissions"),
    retry: retryUnlessMissing,
  });
}

export function useRoleDefinitions() {
  return useQuery({
    queryKey: ["role-definitions"],
    queryFn: () => apiFetch<RoleListResponse>("/admin/roles"),
    retry: retryUnlessMissing,
  });
}

export function useCreatePermission() {
  const qc = useQueryClient();

  return useMutation<
    PermissionEnvelopeResponse,
    Error,
    CreatePermissionRequest
  >({
    mutationFn: (data) =>
      apiFetch<PermissionEnvelopeResponse>("/admin/permissions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();

  return useMutation<
    PermissionEnvelopeResponse,
    Error,
    { name: string; description: string | null }
  >({
    mutationFn: ({ name, description }) =>
      apiFetch<PermissionEnvelopeResponse>(
        `/admin/permissions/${segment(name)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
}

export function useDeletePermission() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (name) =>
      apiFetch<MessageResponse>(`/admin/permissions/${segment(name)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions"] });
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
    },
  });
}

export function useSetRolePermissions() {
  const qc = useQueryClient();

  return useMutation<
    RoleEnvelopeResponse,
    Error,
    { kind: RoleKind; name: string; permissions: string[] }
  >({
    mutationFn: ({ kind, name, permissions }) =>
      apiFetch<RoleEnvelopeResponse>(
        `/admin/roles/${segment(kind)}/${segment(name)}/permissions`,
        {
          method: "PUT",
          body: JSON.stringify({ permissions }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
    },
  });
}

export function useCreateOrganizationRole() {
  const qc = useQueryClient();

  return useMutation<
    RoleEnvelopeResponse,
    Error,
    CreateOrganizationRoleRequest
  >({
    mutationFn: (data) =>
      apiFetch<RoleEnvelopeResponse>("/admin/organization-roles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
    },
  });
}

export function useUpdateOrganizationRole() {
  const qc = useQueryClient();

  return useMutation<
    RoleEnvelopeResponse,
    Error,
    { name: string; description: string | null }
  >({
    mutationFn: ({ name, description }) =>
      apiFetch<RoleEnvelopeResponse>(
        `/admin/organization-roles/${segment(name)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
    },
  });
}

export function useDeleteOrganizationRole() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (name) =>
      apiFetch<MessageResponse>(`/admin/organization-roles/${segment(name)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-definitions"] });
    },
  });
}
