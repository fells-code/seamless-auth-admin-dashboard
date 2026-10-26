/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useDiscardPolicyDraft,
  usePolicyDryRun,
  usePolicyState,
  usePolicyVersions,
  usePublishPolicy,
  useRollbackPolicy,
  useSavePolicyDraft,
} from "./usePolicy";
import { makePolicy } from "../test/policyFixtures";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("../lib/api", () => ({ apiFetch: mocks.apiFetch }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mocks.apiFetch.mockReset();
  mocks.apiFetch.mockResolvedValue({});
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("policy reads", () => {
  it("reads the published policy and draft", async () => {
    const { result } = renderHook(() => usePolicyState(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.apiFetch).toHaveBeenCalledWith("/system-config/policy");
  });

  it("reads the version history", async () => {
    const { result } = renderHook(() => usePolicyVersions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/system-config/policy/versions",
    );
  });
});

describe("policy writes", () => {
  it("saves the draft as the whole policy document", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const policy = makePolicy({ login_methods: ["passkey"] });
    const { result } = renderHook(() => useSavePolicyDraft(), { wrapper });

    await act(() => result.current.mutateAsync(policy));

    expect(mocks.apiFetch).toHaveBeenCalledWith("/system-config/policy/draft", {
      method: "PUT",
      body: JSON.stringify({ policy }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["policy"] });
  });

  it("discards the draft", async () => {
    const { result } = renderHook(() => useDiscardPolicyDraft(), { wrapper });

    await act(() => result.current.mutateAsync());

    expect(mocks.apiFetch).toHaveBeenCalledWith("/system-config/policy/draft", {
      method: "DELETE",
    });
  });

  it("publishes against the reviewed version and refreshes system config", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => usePublishPolicy(), { wrapper });

    await act(() => result.current.mutateAsync({ expectedVersion: 4 }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/system-config/policy/publish",
      { method: "POST", body: JSON.stringify({ expectedVersion: 4 }) },
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["policy"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["system-config"] });
  });

  it("reloads the policy when a publish is refused, so a conflict shows the new version", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    mocks.apiFetch.mockRejectedValue(new Error("conflict"));
    const { result } = renderHook(() => usePublishPolicy(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ expectedVersion: 4 }).catch(() => {}),
    );

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["policy"] });
  });

  it("rolls back to a version against the reviewed version", async () => {
    const { result } = renderHook(() => useRollbackPolicy(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ version: 2, expectedVersion: 5 }),
    );

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/system-config/policy/rollback",
      {
        method: "POST",
        body: JSON.stringify({ version: 2, expectedVersion: 5 }),
      },
    );
  });
});

describe("usePolicyDryRun", () => {
  it("evaluates the saved draft when no policy is given", async () => {
    const { result } = renderHook(() => usePolicyDryRun(), { wrapper });

    await act(() => result.current.mutateAsync({ days: 14 }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/system-config/policy/dry-run",
      { method: "POST", body: JSON.stringify({ days: 14 }) },
    );
  });

  it("evaluates an unsaved policy when one is given", async () => {
    const policy = makePolicy();
    const { result } = renderHook(() => usePolicyDryRun(), { wrapper });

    await act(() => result.current.mutateAsync({ days: 7, policy }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/system-config/policy/dry-run",
      { method: "POST", body: JSON.stringify({ days: 7, policy }) },
    );
  });
});
