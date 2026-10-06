/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AdminEnrollmentResponse,
  EnrollmentInviteRequest,
  EnrollmentInviteResponse,
  EnrollmentStatus,
} from "@seamless-auth/types";
import { apiFetch } from "../lib/api";

export type EnrollmentParams = {
  limit?: number;
  offset?: number;
  organizationId?: string;
  status?: EnrollmentStatus;
  imported?: boolean;
  search?: string;
};

// The API fills in the status default, so the dashboard need not send it.
export type EnrollmentInviteInput = Omit<EnrollmentInviteRequest, "status"> & {
  status?: EnrollmentInviteRequest["status"];
};

export function useEnrollment(params: EnrollmentParams = {}) {
  const query = new URLSearchParams();

  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (params.organizationId) query.set("organizationId", params.organizationId);
  if (params.status) query.set("status", params.status);
  if (params.imported !== undefined) {
    query.set("imported", String(params.imported));
  }
  // The API rejects an all-whitespace term with a 400 rather than treating it
  // as no filter.
  const search = params.search?.trim();
  if (search) query.set("search", search);

  const queryString = query.toString();

  return useQuery({
    queryKey: [
      "enrollment",
      params.limit,
      params.offset,
      params.organizationId ?? "",
      params.status ?? "",
      params.imported,
      search ?? "",
    ],
    queryFn: () =>
      apiFetch<AdminEnrollmentResponse>(
        `/admin/enrollment${queryString ? `?${queryString}` : ""}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useSendEnrollmentInvites() {
  const qc = useQueryClient();

  return useMutation<EnrollmentInviteResponse, Error, EnrollmentInviteInput>({
    mutationFn: (data) =>
      apiFetch<EnrollmentInviteResponse>("/admin/enrollment/invites", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment"] });
    },
  });
}
