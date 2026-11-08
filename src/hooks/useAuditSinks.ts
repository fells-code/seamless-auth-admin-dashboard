/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuditSinkListResponse,
  AuditSinkResponse,
  CalloutTestResponse,
  CreateAuditSinkRequest,
  MessageResponse,
  UpdateAuditSinkRequest,
} from "@seamless-auth/types";
import { apiFetch } from "../lib/api";
import { retryUnlessMissing } from "../lib/callouts";

const segment = encodeURIComponent;

export function useAuditSinks() {
  return useQuery({
    queryKey: ["audit-sinks"],
    queryFn: () => apiFetch<AuditSinkListResponse>("/admin/audit-sinks"),
    retry: retryUnlessMissing,
    // Lag and the last delivery move on their own, so a page left open keeps
    // reporting them.
    refetchInterval: 30_000,
  });
}

export function useCreateAuditSink() {
  const qc = useQueryClient();

  return useMutation<AuditSinkResponse, Error, CreateAuditSinkRequest>({
    mutationFn: (data) =>
      apiFetch<AuditSinkResponse>("/admin/audit-sinks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-sinks"] });
    },
  });
}

export function useUpdateAuditSink() {
  const qc = useQueryClient();

  return useMutation<
    AuditSinkResponse,
    Error,
    { id: string; changes: UpdateAuditSinkRequest }
  >({
    mutationFn: ({ id, changes }) =>
      apiFetch<AuditSinkResponse>(`/admin/audit-sinks/${segment(id)}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-sinks"] });
    },
  });
}

export function useDeleteAuditSink() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<MessageResponse>(`/admin/audit-sinks/${segment(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-sinks"] });
    },
  });
}

/** A test record is not part of the chain and does not move the cursor. */
export function useTestAuditSink() {
  return useMutation<CalloutTestResponse, Error, string>({
    mutationFn: (id) =>
      apiFetch<CalloutTestResponse>(`/admin/audit-sinks/${segment(id)}/test`, {
        method: "POST",
      }),
  });
}
