/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  roles: string[];
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
    roles: string[];
  };
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdByUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  membership?: OrganizationMembership;
};

export type CreateOrganizationInput = {
  name: string;
  slug?: string;
};

export type UpdateOrganizationInput = {
  organizationId: string;
  name?: string;
  slug?: string;
};

export type OrganizationMemberInput = {
  organizationId: string;
  email: string;
  roles?: string[];
  scopes?: string[];
};

export type OrganizationMemberUpdateInput = {
  organizationId: string;
  userId: string;
  roles?: string[];
  scopes?: string[];
};

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () =>
      apiFetch<{ organizations: Organization[]; total: number }>(
        "/admin/organizations",
      ),
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();

  return useMutation<
    { organization: Organization },
    Error,
    CreateOrganizationInput
  >({
    mutationFn: (data) =>
      apiFetch<{ organization: Organization }>("/admin/organizations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();

  return useMutation<
    { organization: Organization },
    Error,
    UpdateOrganizationInput
  >({
    mutationFn: ({ organizationId, ...data }) =>
      apiFetch<{ organization: Organization }>(
        `/admin/organizations/${organizationId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.invalidateQueries({
        queryKey: ["organization-members", data.organization.id],
      });
    },
  });
}

export function useOrganizationMembers(organizationId?: string | null) {
  return useQuery({
    queryKey: ["organization-members", organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return apiFetch<{ members: OrganizationMembership[]; total: number }>(
        `/admin/organizations/${organizationId}/members`,
      );
    },
  });
}

export function useAddOrganizationMember() {
  const qc = useQueryClient();

  return useMutation<
    { membership: OrganizationMembership },
    Error,
    OrganizationMemberInput
  >({
    mutationFn: ({ organizationId, ...data }) =>
      apiFetch<{ membership: OrganizationMembership }>(
        `/admin/organizations/${organizationId}/members`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.invalidateQueries({
        queryKey: ["organization-members", variables.organizationId],
      });
    },
  });
}

export function useUpdateOrganizationMember() {
  const qc = useQueryClient();

  return useMutation<
    { membership: OrganizationMembership },
    Error,
    OrganizationMemberUpdateInput
  >({
    mutationFn: ({ organizationId, userId, ...data }) =>
      apiFetch<{ membership: OrganizationMembership }>(
        `/admin/organizations/${organizationId}/members/${userId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["organization-members", variables.organizationId],
      });
    },
  });
}

export function useRemoveOrganizationMember() {
  const qc = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { organizationId: string; userId: string }
  >({
    mutationFn: ({ organizationId, userId }) =>
      apiFetch<{ message: string }>(
        `/admin/organizations/${organizationId}/members/${userId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.invalidateQueries({
        queryKey: ["organization-members", variables.organizationId],
      });
    },
  });
}
