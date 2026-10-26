/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  MessageResponse,
  PolicyDocument,
  PolicyDraft,
  PolicyDryRunResponse,
  PolicyStateResponse,
  PolicyVersion,
  PolicyVersionsResponse,
} from "@seamless-auth/types";
import { apiFetch } from "../lib/api";

const BASE_PATH = "/system-config/policy";

export const policyQueryKey = ["policy"] as const;

/**
 * The API does not return a cap flag on the dry run response, only in its
 * `policy_dry_run` audit event, so the page reads one if a later API adds it.
 */
export type PolicyDryRunReport = PolicyDryRunResponse & { capped?: boolean };

export function usePolicyState() {
  return useQuery({
    queryKey: [...policyQueryKey, "state"],
    queryFn: () => apiFetch<PolicyStateResponse>(BASE_PATH),
  });
}

export function usePolicyVersions() {
  return useQuery({
    queryKey: [...policyQueryKey, "versions"],
    queryFn: () => apiFetch<PolicyVersionsResponse>(`${BASE_PATH}/versions`),
  });
}

function invalidatePolicy(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: policyQueryKey });
}

export function useSavePolicyDraft() {
  const qc = useQueryClient();

  return useMutation<PolicyDraft, Error, PolicyDocument>({
    mutationFn: (policy) =>
      apiFetch<PolicyDraft>(`${BASE_PATH}/draft`, {
        method: "PUT",
        body: JSON.stringify({ policy }),
      }),
    onSuccess: () => invalidatePolicy(qc),
  });
}

export function useDiscardPolicyDraft() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, void>({
    mutationFn: () =>
      apiFetch<MessageResponse>(`${BASE_PATH}/draft`, { method: "DELETE" }),
    onSettled: () => invalidatePolicy(qc),
  });
}

// Publishing and rolling back rewrite the policy keys in system config, so the
// System Configuration screen has to re-read them too. Settled rather than
// success: a 409 means someone else published, and the page must reload.
function usePolicyWrite<TInput>(
  path: string,
  body: (input: TInput) => Record<string, number>,
) {
  const qc = useQueryClient();

  return useMutation<PolicyVersion, Error, TInput>({
    mutationFn: (input) =>
      apiFetch<PolicyVersion>(`${BASE_PATH}/${path}`, {
        method: "POST",
        body: JSON.stringify(body(input)),
      }),
    onSettled: () => {
      void invalidatePolicy(qc);
      void qc.invalidateQueries({ queryKey: ["system-config"] });
    },
  });
}

export function usePublishPolicy() {
  return usePolicyWrite<{ expectedVersion: number }>(
    "publish",
    ({ expectedVersion }) => ({ expectedVersion }),
  );
}

export function useRollbackPolicy() {
  return usePolicyWrite<{ version: number; expectedVersion: number }>(
    "rollback",
    ({ version, expectedVersion }) => ({ version, expectedVersion }),
  );
}

export function usePolicyDryRun() {
  return useMutation<
    PolicyDryRunReport,
    Error,
    { days: number; policy?: PolicyDocument }
  >({
    mutationFn: ({ days, policy }) =>
      apiFetch<PolicyDryRunReport>(`${BASE_PATH}/dry-run`, {
        method: "POST",
        body: JSON.stringify(policy ? { days, policy } : { days }),
      }),
  });
}
