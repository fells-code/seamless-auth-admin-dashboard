/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { apiDownload, apiFetch } from "../lib/api";
import { saveBlob } from "../lib/csvExport";

// Restated from the auth API's response schema. It is not in @seamless-auth/types.
export type CoverageFigures = {
  users: number;
  passkeyUsers: number;
  /** `passkeyUsers` over `users`, a percentage to one decimal place. */
  percent: number;
};

export type SignInMethod =
  | "passkey"
  | "email_otp"
  | "phone_otp"
  | "otp"
  | "magic_link"
  | "totp"
  | "oauth";

export type CoverageReport = {
  period: { from: string; to: string };
  generatedAt: string;
  organizationId: string | null;
  bucket: "week" | "month";
  policy: {
    phishingResistantOnly: boolean;
    loginMethods: string[];
    passkeyFallbackEnabled: boolean;
    authenticator: {
      attestation: string;
      userVerification: string;
      attachment: string;
      syncedPasskeys: string;
      requireKnownAuthenticator: boolean;
      aaguidAllowList: string[];
      aaguidDenyList: string[];
    };
  };
  coverage: CoverageFigures;
  byOrganization: (CoverageFigures & {
    organizationId: string | null;
    name: string | null;
  })[];
  trend: (CoverageFigures & { start: string; end: string })[];
  authenticatorMix: {
    aaguid: string | null;
    name: string | null;
    credentials: number;
    users: number;
    backupEligible: number;
    backedUp: number;
  }[];
  signInMix: {
    total: number;
    phishingResistant: number;
    percent: number;
    methods: {
      method: SignInMethod;
      phishingResistant: boolean;
      signIns: number;
      users: number;
    }[];
  };
};

export type CoverageReportParams = {
  /** Whole UTC dates, `YYYY-MM-DD`, both included. */
  from?: string;
  to?: string;
  organizationId?: string;
  bucket?: "week" | "month";
};

function coverageQuery(params: CoverageReportParams, format?: "csv") {
  const query = new URLSearchParams();

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.organizationId) query.set("organizationId", params.organizationId);
  if (params.bucket) query.set("bucket", params.bucket);
  if (format) query.set("format", format);

  const queryString = query.toString();
  return `/admin/reports/authentication-coverage${queryString ? `?${queryString}` : ""}`;
}

export function useCoverageReport(params: CoverageReportParams = {}) {
  return useQuery({
    queryKey: [
      "coverage-report",
      params.from ?? "",
      params.to ?? "",
      params.organizationId ?? "",
      params.bucket ?? "",
    ],
    queryFn: () => apiFetch<CoverageReport>(coverageQuery(params)),
    placeholderData: keepPreviousData,
  });
}

/** Downloads the API's own CSV rendering, which is the one meant for an assessment. */
export function useDownloadCoverageCsv() {
  return useMutation<void, Error, CoverageReportParams>({
    mutationFn: async (params) => {
      const { blob, filename } = await apiDownload(
        coverageQuery(params, "csv"),
        "authentication-coverage.csv",
      );
      saveBlob(blob, filename);
    },
  });
}
