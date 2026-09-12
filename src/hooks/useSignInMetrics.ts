/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type SignInMethod = "passkey" | "otp" | "magic_link" | "oauth" | "totp";

/**
 * One row per method, device class, mail provider and owner flag. The API does
 * not pre-aggregate per dimension; the page pivots on whichever it is showing.
 */
export interface SignInBreakdownRow {
  method: SignInMethod;
  /** Null on rows written before the column existed. */
  deviceClass: string | null;
  /** Null when the subject's address was not known when the row was written. */
  mailProvider: string | null;
  /** Null when the subject was unknown, as distinct from a known non-owner. */
  owner: boolean | null;
  /** Attempts in which this method succeeded at least once. */
  success: number;
  /** Attempts in which this method was presented and never succeeded. */
  failed: number;
}

// Mirrors SignInMetricsResponseSchema in seamless-auth-api. It is not in
// @seamless-auth/types yet, so the shape lives here until that package picks
// it up.
export interface SignInMetricsResponse {
  deploymentId: string | null;
  /** Distinct attempts. `delivered` is not a strict step: passkeys send nothing. */
  attempts: {
    started: number;
    delivered: number;
    presented: number;
    completed: number;
  };
  signIns: { success: number; failed: number; successRate: number };
  breakdown: SignInBreakdownRow[];
}

export function useSignInMetrics(params: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const search = query.toString();

  return useQuery({
    queryKey: ["signInMetrics", params.from, params.to],
    queryFn: () =>
      apiFetch<SignInMetricsResponse>(
        `/internal/metrics/sign-ins${search ? `?${search}` : ""}`,
      ),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
