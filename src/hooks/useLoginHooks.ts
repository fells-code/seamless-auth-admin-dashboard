/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CalloutTestResponse,
  LoginHookInvocationListResponse,
  LoginHookListResponse,
  LoginHookOutcome,
  LoginHookResponse,
  LoginHookSecretRotatedResponse,
  LoginHookTrigger,
  MessageResponse,
  SetLoginHookRequest,
} from "@seamless-auth/types";
import { apiFetch } from "../lib/api";
import { retryUnlessMissing } from "../lib/callouts";

export function useLoginHooks() {
  return useQuery({
    queryKey: ["login-hooks"],
    queryFn: () => apiFetch<LoginHookListResponse>("/admin/login-hooks"),
    retry: retryUnlessMissing,
  });
}

export function useLoginHookInvocations(
  trigger: LoginHookTrigger,
  outcome?: LoginHookOutcome,
) {
  return useQuery({
    queryKey: ["login-hook-invocations", trigger, outcome ?? null],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (outcome) params.set("outcome", outcome);

      return apiFetch<LoginHookInvocationListResponse>(
        `/admin/login-hooks/${trigger}/invocations?${params}`,
      );
    },
    retry: retryUnlessMissing,
  });
}

export function useSetLoginHook() {
  const qc = useQueryClient();

  return useMutation<
    LoginHookResponse,
    Error,
    { trigger: LoginHookTrigger; hook: SetLoginHookRequest }
  >({
    mutationFn: ({ trigger, hook }) =>
      apiFetch<LoginHookResponse>(`/admin/login-hooks/${trigger}`, {
        method: "PUT",
        body: JSON.stringify(hook),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["login-hooks"] });
    },
  });
}

export function useDeleteLoginHook() {
  const qc = useQueryClient();

  return useMutation<MessageResponse, Error, LoginHookTrigger>({
    mutationFn: (trigger) =>
      apiFetch<MessageResponse>(`/admin/login-hooks/${trigger}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, trigger) => {
      qc.invalidateQueries({ queryKey: ["login-hooks"] });
      qc.invalidateQueries({ queryKey: ["login-hook-invocations", trigger] });
    },
  });
}

export function useRotateLoginHookSecret() {
  const qc = useQueryClient();

  return useMutation<LoginHookSecretRotatedResponse, Error, LoginHookTrigger>({
    mutationFn: (trigger) =>
      apiFetch<LoginHookSecretRotatedResponse>(
        `/admin/login-hooks/${trigger}/secret`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["login-hooks"] });
    },
  });
}

/** A test call is not recorded as an invocation, so nothing else changes. */
export function useTestLoginHook() {
  return useMutation<CalloutTestResponse, Error, LoginHookTrigger>({
    mutationFn: (trigger) =>
      apiFetch<CalloutTestResponse>(`/admin/login-hooks/${trigger}/test`, {
        method: "POST",
      }),
  });
}
