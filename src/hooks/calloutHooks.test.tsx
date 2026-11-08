/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import {
  useAuditSinks,
  useCreateAuditSink,
  useDeleteAuditSink,
  useTestAuditSink,
  useUpdateAuditSink,
} from "./useAuditSinks";
import {
  useCustomClaims,
  useDeleteCustomClaims,
  useSetCustomClaims,
} from "./useCustomClaims";
import {
  useDeleteLoginHook,
  useLoginHookInvocations,
  useLoginHooks,
  useRotateLoginHookSecret,
  useSetLoginHook,
  useTestLoginHook,
} from "./useLoginHooks";
import {
  useCreateWebhook,
  useDeleteWebhook,
  useRedeliverWebhook,
  useRotateWebhookSecret,
  useTestWebhook,
  useUpdateWebhook,
  useWebhookDeliveries,
  useWebhookDelivery,
  useWebhookEndpoints,
} from "./useWebhooks";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", async (importActual) => ({
  ...(await importActual<typeof import("../lib/api")>()),
  apiFetch,
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  return {
    invalidate,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

function invalidatedKeys(invalidate: ReturnType<typeof setup>["invalidate"]) {
  return invalidate.mock.calls.map(([filters]) => filters?.queryKey);
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
});

type ReadHook = () => { isSuccess: boolean; isError: boolean };

describe("reads", () => {
  it.each<[string, ReadHook, string]>([
    ["useWebhookEndpoints", () => useWebhookEndpoints(), "/admin/webhooks"],
    ["useLoginHooks", () => useLoginHooks(), "/admin/login-hooks"],
    ["useCustomClaims", () => useCustomClaims(), "/admin/custom-claims"],
    ["useAuditSinks", () => useAuditSinks(), "/admin/audit-sinks"],
  ])("%s reads its list route", async (_name, useHook, path) => {
    const { result } = renderHook(useHook, { wrapper: setup().wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiFetch).toHaveBeenCalledWith(path);
  });

  it.each<[string, ReadHook]>([
    ["useWebhookEndpoints", () => useWebhookEndpoints()],
    ["useLoginHooks", () => useLoginHooks()],
    ["useCustomClaims", () => useCustomClaims()],
    ["useAuditSinks", () => useAuditSinks()],
  ])("%s does not retry a 404", async (_name, useHook) => {
    apiFetch.mockRejectedValue(new ApiError("Not found", 404));

    const { result } = renderHook(useHook, { wrapper: setup().wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("filters and pages deliveries", async () => {
    const { result } = renderHook(
      () =>
        useWebhookDeliveries({
          endpointId: "e1",
          status: "dead",
          cursor: "abc",
        }),
      { wrapper: setup().wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/webhook-deliveries?limit=25&endpointId=e1&status=dead&cursor=abc",
    );
  });

  it("reads one delivery only when one is chosen", async () => {
    const { wrapper } = setup();
    renderHook(() => useWebhookDelivery(null), { wrapper });
    const { result } = renderHook(() => useWebhookDelivery("d 1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/admin/webhook-deliveries/d%201");
  });

  it("reads a trigger's invocations by outcome", async () => {
    const { result } = renderHook(
      () => useLoginHookInvocations("pre_token", "denied"),
      { wrapper: setup().wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiFetch).toHaveBeenCalledWith(
      "/admin/login-hooks/pre_token/invocations?limit=50&outcome=denied",
    );
  });
});

describe("writes", () => {
  type Case = [
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => { mutateAsync: (input: any) => Promise<unknown> },
    unknown,
    string,
    RequestInit,
    unknown[][],
  ];

  const cases: Case[] = [
    [
      "create webhook",
      () => useCreateWebhook(),
      { url: "https://x.example", eventTypes: ["user.created"] },
      "/admin/webhooks",
      {
        method: "POST",
        body: JSON.stringify({
          url: "https://x.example",
          eventTypes: ["user.created"],
        }),
      },
      [["webhooks"]],
    ],
    [
      "update webhook",
      () => useUpdateWebhook(),
      { id: "e1", changes: { enabled: false } },
      "/admin/webhooks/e1",
      { method: "PATCH", body: JSON.stringify({ enabled: false }) },
      [["webhooks"]],
    ],
    [
      "delete webhook",
      () => useDeleteWebhook(),
      "e1",
      "/admin/webhooks/e1",
      { method: "DELETE" },
      [["webhooks"], ["webhook-deliveries"]],
    ],
    [
      "rotate webhook secret",
      () => useRotateWebhookSecret(),
      "e1",
      "/admin/webhooks/e1/secret",
      { method: "POST" },
      [["webhooks"]],
    ],
    [
      "test webhook",
      () => useTestWebhook(),
      "e1",
      "/admin/webhooks/e1/test",
      { method: "POST" },
      [["webhook-deliveries"]],
    ],
    [
      "redeliver",
      () => useRedeliverWebhook(),
      "d1",
      "/admin/webhook-deliveries/d1/redeliver",
      { method: "POST" },
      [["webhook-deliveries"], ["webhook-delivery", "d1"]],
    ],
    [
      "set login hook",
      () => useSetLoginHook(),
      {
        trigger: "post_login",
        hook: {
          url: "https://h.example",
          timeoutMs: 2000,
          failureMode: "closed",
          enabled: true,
        },
      },
      "/admin/login-hooks/post_login",
      {
        method: "PUT",
        body: JSON.stringify({
          url: "https://h.example",
          timeoutMs: 2000,
          failureMode: "closed",
          enabled: true,
        }),
      },
      [["login-hooks"]],
    ],
    [
      "delete login hook",
      () => useDeleteLoginHook(),
      "pre_token",
      "/admin/login-hooks/pre_token",
      { method: "DELETE" },
      [["login-hooks"], ["login-hook-invocations", "pre_token"]],
    ],
    [
      "rotate login hook secret",
      () => useRotateLoginHookSecret(),
      "post_login",
      "/admin/login-hooks/post_login/secret",
      { method: "POST" },
      [["login-hooks"]],
    ],
    [
      "test login hook",
      () => useTestLoginHook(),
      "post_login",
      "/admin/login-hooks/post_login/test",
      { method: "POST" },
      [],
    ],
    [
      "set custom claims",
      () => useSetCustomClaims(),
      {
        sourceKind: "organization_role",
        sourceName: "Legacy Role",
        claims: { tier: "gold" },
      },
      "/admin/custom-claims/organization_role/Legacy%20Role",
      { method: "PUT", body: JSON.stringify({ claims: { tier: "gold" } }) },
      [["custom-claims"]],
    ],
    [
      "delete custom claims",
      () => useDeleteCustomClaims(),
      { sourceKind: "oidc_client", sourceName: "docs" },
      "/admin/custom-claims/oidc_client/docs",
      { method: "DELETE" },
      [["custom-claims"]],
    ],
    [
      "create audit sink",
      () => useCreateAuditSink(),
      { name: "S" },
      "/admin/audit-sinks",
      { method: "POST", body: JSON.stringify({ name: "S" }) },
      [["audit-sinks"]],
    ],
    [
      "update audit sink",
      () => useUpdateAuditSink(),
      { id: "s1", changes: { enabled: true } },
      "/admin/audit-sinks/s1",
      { method: "PATCH", body: JSON.stringify({ enabled: true }) },
      [["audit-sinks"]],
    ],
    [
      "delete audit sink",
      () => useDeleteAuditSink(),
      "s1",
      "/admin/audit-sinks/s1",
      { method: "DELETE" },
      [["audit-sinks"]],
    ],
    [
      "test audit sink",
      () => useTestAuditSink(),
      "s1",
      "/admin/audit-sinks/s1/test",
      { method: "POST" },
      [],
    ],
  ];

  it.each(cases)(
    "%s calls its route and refreshes what changed",
    async (_name, useHook, input, path, init, keys) => {
      const { wrapper, invalidate } = setup();
      const { result } = renderHook(useHook, { wrapper });

      await act(() => result.current.mutateAsync(input));

      expect(apiFetch).toHaveBeenCalledWith(path, init);
      expect(invalidatedKeys(invalidate)).toEqual(keys);
    },
  );
});
