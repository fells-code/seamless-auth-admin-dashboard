/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { CalloutFailure, CalloutTestResponse } from "@seamless-auth/types";
import { ApiError } from "./api";
import { getErrorMessage } from "./errorMessage";
import { shouldRetryQuery } from "./queryRetry";
import { isRouteMissing } from "./roleRefusals";

// A 404 on a list route means the API predates it, which a retry cannot change.
export function retryUnlessMissing(failureCount: number, error: unknown) {
  return !isRouteMissing(error) && shouldRetryQuery(failureCount, error);
}

/**
 * Webhooks, login hooks and audit sinks report why a call failed with one of a
 * few coarse reasons, never the resolved address or the socket's error text.
 */
const FAILURE_TEXT: Record<CalloutFailure, string> = {
  refused:
    "The API refused to call this address, for example a private address not listed in CALLOUT_PRIVATE_HOSTS, or plain http in production.",
  timed_out: "The destination did not answer in time.",
  connection_failed: "The API could not connect to the destination.",
  http_status: "The destination answered with an error status.",
  invalid_response:
    "The destination answered with a body the API could not use.",
  too_large: "The answer was over the size limit.",
};

export function describeCalloutFailure(
  failure: CalloutFailure | null | undefined,
  statusCode?: number | null,
) {
  if (!failure) return null;

  if (failure === "http_status" && statusCode) {
    return `The destination answered HTTP ${statusCode}.`;
  }

  return FAILURE_TEXT[failure] ?? failure;
}

export function describeTestResult(result: CalloutTestResponse) {
  const timing = `${result.durationMs} ms`;

  if (result.ok) {
    return result.statusCode
      ? `Answered HTTP ${result.statusCode} in ${timing}.`
      : `Succeeded in ${timing}.`;
  }

  return `${describeCalloutFailure(result.failure, result.statusCode) ?? "The call failed."} Took ${timing}.`;
}

type Issue = { path?: unknown; message?: unknown };

function issueText(issue: Issue) {
  const path = Array.isArray(issue.path)
    ? issue.path
        .filter((part) => typeof part === "string" || typeof part === "number")
        .join(".")
    : "";
  const message = typeof issue.message === "string" ? issue.message : "";

  if (!message) return null;
  return path ? `${path}: ${message}` : message;
}

/** Issues from a local `safeParse`, in the same words the API would use. */
export function describeIssues(issues: readonly Issue[]) {
  return issues.map(issueText).filter(Boolean).join("; ");
}

/**
 * A request the API's schema refused answers `invalid_request` with the field
 * issues in `details.issues`, and the bare message says only that validation
 * failed, which does not tell an operator which field to fix.
 */
export function describeWriteRefusal(error: unknown) {
  const message = getErrorMessage(error);

  if (
    !(error instanceof ApiError) ||
    typeof error.details !== "object" ||
    error.details === null
  ) {
    return message;
  }

  const issues = (error.details as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return message;

  const described = describeIssues(issues as Issue[]);
  return described ? `${message} ${described}` : message;
}

export function formatTimestamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : null;
}
