/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type {
  AddOrganizationMemberRequest,
  AdminOrganizationListResponse,
  CreateOrganizationRequest,
  MessageResponse,
  OrganizationEnvelopeResponse,
  OrganizationMembersResponse,
  OrganizationMembershipEnvelopeResponse,
  UpdateOrganizationMemberRequest,
  UpdateOrganizationRequest,
} from "@seamless-auth/types";

// The organization and user ids travel in the path rather than the body, so the
// mutation inputs below carry them alongside the request payload.
export type CreateOrganizationInput = CreateOrganizationRequest;

export type UpdateOrganizationInput = UpdateOrganizationRequest & {
  organizationId: string;
};

export type OrganizationMemberInput = AddOrganizationMemberRequest & {
  organizationId: string;
};

export type OrganizationMemberUpdateInput = UpdateOrganizationMemberRequest & {
  organizationId: string;
  userId: string;
};

export function useOrganizations(
  params: { limit?: number; offset?: number; search?: string } = {},
) {
  const query = new URLSearchParams();

  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  // Sent only when there is something to match. The API rejects an all-whitespace
  // term with a 400 rather than treating it as no filter.
  const search = params.search?.trim();
  if (search) query.set("search", search);

  const queryString = query.toString();

  return useQuery({
    // GET /admin/organizations applies a limit of 50 when none is sent, so
    // calling it bare returns a capped page. The window is explicit and part of
    // the key.
    queryKey: ["organizations", params.limit, params.offset, search ?? ""],
    queryFn: () =>
      apiFetch<AdminOrganizationListResponse>(
        `/admin/organizations${queryString ? `?${queryString}` : ""}`,
      ),
    // Paging and typing in the search box both change the query key. Without
    // this the screen drops to its full-page skeleton on every keystroke.
    placeholderData: keepPreviousData,
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (organizationId) =>
      apiFetch<MessageResponse>(`/admin/organizations/${organizationId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, organizationId) => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.removeQueries({ queryKey: ["organization-members", organizationId] });
    },
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();

  return useMutation<
    OrganizationEnvelopeResponse,
    Error,
    CreateOrganizationInput
  >({
    mutationFn: (data) =>
      apiFetch<OrganizationEnvelopeResponse>("/admin/organizations", {
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
    OrganizationEnvelopeResponse,
    Error,
    UpdateOrganizationInput
  >({
    mutationFn: ({ organizationId, ...data }) =>
      apiFetch<OrganizationEnvelopeResponse>(
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

      return apiFetch<OrganizationMembersResponse>(
        `/admin/organizations/${organizationId}/members`,
      );
    },
  });
}

export function useAddOrganizationMember() {
  const qc = useQueryClient();

  return useMutation<
    OrganizationMembershipEnvelopeResponse,
    Error,
    OrganizationMemberInput
  >({
    mutationFn: ({ organizationId, ...data }) =>
      apiFetch<OrganizationMembershipEnvelopeResponse>(
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
    OrganizationMembershipEnvelopeResponse,
    Error,
    OrganizationMemberUpdateInput
  >({
    mutationFn: ({ organizationId, userId, ...data }) =>
      apiFetch<OrganizationMembershipEnvelopeResponse>(
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
    MessageResponse,
    Error,
    { organizationId: string; userId: string }
  >({
    mutationFn: ({ organizationId, userId }) =>
      apiFetch<MessageResponse>(
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
