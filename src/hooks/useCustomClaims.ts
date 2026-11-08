/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CustomClaimListResponse,
  CustomClaimSourceKind,
  CustomClaimSourceResponse,
  MessageResponse,
  SetCustomClaimsRequest,
} from "@seamless-auth/types";
import { apiFetch } from "../lib/api";
import { retryUnlessMissing } from "../lib/callouts";

// Legacy organization role names can contain spaces.
const segment = encodeURIComponent;

export type ClaimSource = {
  sourceKind: CustomClaimSourceKind;
  sourceName: string;
};

export function useCustomClaims() {
  return useQuery({
    queryKey: ["custom-claims"],
    queryFn: () => apiFetch<CustomClaimListResponse>("/admin/custom-claims"),
    retry: retryUnlessMissing,
  });
}

export function useSetCustomClaims() {
  const qc = useQueryClient();

  return useMutation<
    CustomClaimSourceResponse,
    Error,
    ClaimSource & SetCustomClaimsRequest
  >({
    mutationFn: ({ sourceKind, sourceName, claims }) =>
      apiFetch<CustomClaimSourceResponse>(
        `/admin/custom-claims/${sourceKind}/${segment(sourceName)}`,
        { method: "PUT", body: JSON.stringify({ claims }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-claims"] });
    },
  });
}

export function useDeleteCustomClaims() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, ClaimSource>({
    mutationFn: ({ sourceKind, sourceName }) =>
      apiFetch<MessageResponse>(
        `/admin/custom-claims/${sourceKind}/${segment(sourceName)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-claims"] });
    },
  });
}
