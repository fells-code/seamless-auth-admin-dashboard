/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

// Restated from the auth API's response schema. It is not in @seamless-auth/types.
export type ReviewAccounts = {
  enabled: boolean;
  emails: string[];
  codeConfigured: boolean;
  recentSignIns: {
    days: number;
    count: number;
    failedVerifications: number;
    lastSignInAt: string | null;
  };
};

export function useReviewAccounts() {
  return useQuery({
    queryKey: ["review-accounts"],
    queryFn: () => apiFetch<ReviewAccounts>("/admin/review-accounts"),
    // Only ever a notice. An API or adapter that predates the route answers 404,
    // which is not worth retrying or reporting.
    retry: false,
    staleTime: 5 * 60_000,
  });
}
