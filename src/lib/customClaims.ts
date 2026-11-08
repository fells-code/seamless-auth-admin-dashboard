/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  SetCustomClaimsRequestSchema,
  customClaimsByteLength,
  type SetCustomClaimsRequest,
} from "@seamless-auth/types";
import { describeIssues } from "./callouts";

/** As the API's list response gives them. */
export type ReservedClaims = { names: string[]; prefixes: string[] };

function reservedIn(claims: Record<string, unknown>, reserved: ReservedClaims) {
  return Object.keys(claims).filter(
    (name) =>
      reserved.names.includes(name) ||
      reserved.prefixes.some((prefix) => name.startsWith(prefix)),
  );
}

/**
 * Checks a claim set the way the API will, so the operator learns what to fix
 * before a step-up. The API's own reserved list wins over the bundled schema's,
 * since it is the one that refuses the write.
 */
export function checkClaims(
  text: string,
  reserved: ReservedClaims,
  budgetBytes: number,
):
  | { ok: true; request: SetCustomClaimsRequest; bytes: number }
  | { ok: false; problem: string; bytes: number | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, problem: "This is not valid JSON.", bytes: null };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      problem:
        'Claims are a JSON object of names to values, such as { "tier": "gold" }.',
      bytes: null,
    };
  }

  const claims = parsed as Record<string, unknown>;
  const bytes = customClaimsByteLength(claims);

  const refused = reservedIn(claims, reserved);
  if (refused.length > 0) {
    return {
      ok: false,
      problem: `Reserved, so they cannot be set: ${refused.join(", ")}.`,
      bytes,
    };
  }

  if (bytes > budgetBytes) {
    return {
      ok: false,
      problem: `The set is ${bytes} bytes serialized, over the ${budgetBytes} byte budget.`,
      bytes,
    };
  }

  const result = SetCustomClaimsRequestSchema.safeParse({ claims });
  if (!result.success) {
    return { ok: false, problem: describeIssues(result.error.issues), bytes };
  }

  return { ok: true, request: result.data, bytes };
}
