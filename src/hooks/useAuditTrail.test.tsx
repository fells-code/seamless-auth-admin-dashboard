/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportBounds,
  useExportAuditTrail,
  useVerifyAuditTrail,
} from "./useAuditTrail";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiDownload: vi.fn(),
  saveBlob: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  apiFetch: mocks.apiFetch,
  apiDownload: mocks.apiDownload,
}));
vi.mock("../lib/csvExport", () => ({ saveBlob: mocks.saveBlob }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

describe("exportBounds", () => {
  it("turns whole days into half-open UTC bounds that include the last day", () => {
    expect(exportBounds("2026-01-01", "2026-01-31")).toEqual({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
    });
  });

  it("leaves an empty end open", () => {
    expect(exportBounds("", "")).toEqual({ from: undefined, to: undefined });
  });
});

describe("useVerifyAuditTrail", () => {
  it("runs the integrity check only when asked", async () => {
    mocks.apiFetch.mockResolvedValue({ verified: true });

    const { result } = renderHook(() => useVerifyAuditTrail(), { wrapper });
    expect(mocks.apiFetch).not.toHaveBeenCalled();

    await act(() => result.current.mutateAsync());

    expect(mocks.apiFetch).toHaveBeenCalledWith("/admin/auth-events/integrity");
  });
});

describe("useExportAuditTrail", () => {
  it("downloads the period and saves it under the API's name", async () => {
    const blob = new Blob(["{}\n"]);
    mocks.apiDownload.mockResolvedValue({
      blob,
      filename: "auth-events-x.ndjson",
    });

    const { result } = renderHook(() => useExportAuditTrail(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-02-01T00:00:00.000Z",
      }),
    );

    expect(mocks.apiDownload).toHaveBeenCalledWith(
      "/admin/auth-events/export?from=2026-01-01T00%3A00%3A00.000Z&to=2026-02-01T00%3A00%3A00.000Z",
      "auth-events.ndjson",
    );
    expect(mocks.saveBlob).toHaveBeenCalledWith(blob, "auth-events-x.ndjson");
  });

  it("exports the whole trail without bounds", async () => {
    mocks.apiDownload.mockResolvedValue({ blob: new Blob([]), filename: "f" });

    const { result } = renderHook(() => useExportAuditTrail(), { wrapper });
    await act(() => result.current.mutateAsync({}));

    expect(mocks.apiDownload).toHaveBeenCalledWith(
      "/admin/auth-events/export",
      "auth-events.ndjson",
    );
  });
});
