/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCoverageReport, useDownloadCoverageCsv } from "./useCoverageReport";

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

describe("useCoverageReport", () => {
  it("asks for the period, organization and bucket", async () => {
    mocks.apiFetch.mockResolvedValue({ coverage: { users: 1 } });

    const { result } = renderHook(
      () =>
        useCoverageReport({
          from: "2026-01-01",
          to: "2026-03-31",
          organizationId: "org-1",
          bucket: "week",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/admin/reports/authentication-coverage?from=2026-01-01&to=2026-03-31&organizationId=org-1&bucket=week",
    );
  });

  it("lets the API choose the defaults when nothing is given", async () => {
    mocks.apiFetch.mockResolvedValue({});

    const { result } = renderHook(() => useCoverageReport(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/admin/reports/authentication-coverage",
    );
  });
});

describe("useDownloadCoverageCsv", () => {
  it("downloads the API's CSV under the name it gives", async () => {
    const blob = new Blob(["a,b"]);
    mocks.apiDownload.mockResolvedValue({ blob, filename: "coverage.csv" });

    const { result } = renderHook(() => useDownloadCoverageCsv(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ from: "2026-01-01", to: "2026-01-31" }),
    );

    expect(mocks.apiDownload).toHaveBeenCalledWith(
      "/admin/reports/authentication-coverage?from=2026-01-01&to=2026-01-31&format=csv",
      "authentication-coverage.csv",
    );
    expect(mocks.saveBlob).toHaveBeenCalledWith(blob, "coverage.csv");
  });
});
