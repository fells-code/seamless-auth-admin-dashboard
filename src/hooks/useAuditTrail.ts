/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation } from "@tanstack/react-query";
import { apiDownload, apiFetch } from "../lib/api";
import { saveBlob } from "../lib/csvExport";

// Restated from the auth API's response schema. It is not in @seamless-auth/types.
export interface AuditIntegrityReport {
  verified: boolean;
  checkedAt: string;
  rowsChecked: number;
  firstSeq: number | null;
  lastSeq: number | null;
  anchorHash: string | null;
  head: { seq: number; hash: string | null } | null;
  firstFailure: {
    seq: number;
    id: string | null;
    reason: "hash_mismatch" | "broken_link" | "sequence_gap" | "head_mismatch";
  } | null;
}

/**
 * Runs the audit chain check on demand. It is a mutation rather than a query
 * because the API recomputes every hash in the trail, which is not something to
 * repeat on every visit to the page or every window focus.
 */
export function useVerifyAuditTrail() {
  return useMutation<AuditIntegrityReport, Error, void>({
    mutationFn: () =>
      apiFetch<AuditIntegrityReport>("/admin/auth-events/integrity"),
  });
}

export type AuditExportParams = {
  /** ISO date-times, `from` inclusive and `to` exclusive. */
  from?: string;
  to?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** A whole-day period as the export's half-open timestamp bounds, in UTC. */
export function exportBounds(from: string, to: string): AuditExportParams {
  return {
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to
      ? new Date(Date.parse(`${to}T00:00:00.000Z`) + DAY_MS).toISOString()
      : undefined,
  };
}

export function useExportAuditTrail() {
  return useMutation<void, Error, AuditExportParams>({
    mutationFn: async ({ from, to }) => {
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      const queryString = query.toString();

      const { blob, filename } = await apiDownload(
        `/admin/auth-events/export${queryString ? `?${queryString}` : ""}`,
        "auth-events.ndjson",
      );
      saveBlob(blob, filename);
    },
  });
}
