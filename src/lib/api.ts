/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { getApiUrl } from "./runtimeConfig";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");

  // Resolved per request rather than at module scope. getApiUrl throws when the
  // app is misconfigured, and doing that at import time takes down every module
  // that transitively imports this one, including in tests.
  const baseUrl = getApiUrl().replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/auth${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(formatApiError(res.status, text, path));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `API error: ${res.status} response from ${path} was not valid JSON`,
    );
  }
}

function formatApiError(status: number, body: string, path: string) {
  // Keep the raw upstream detail for debugging, but only in development. The
  // body can carry emails, user ids, or backend stack traces, and production
  // console output is captured by session replay tools and extensions.
  if (body && import.meta.env.DEV) {
    console.error(`API error ${status} on ${path}: ${body}`);
  }

  if (body.includes("missing bearer token")) {
    return [
      "The Seamless Auth API expected an Authorization bearer token.",
      "This dashboard should call the Seamless Auth server adapter, which reads the dashboard session cookie and forwards the bearer token upstream.",
      `Check that API_URL points at the server-adapter origin and that the adapter forwards ${path}.`,
    ].join(" ");
  }

  return safeApiMessage(status, body) ?? friendlyStatusMessage(status);
}

// Statuses where the API's own message is operator-actionable validation
// feedback ("User already exists"). Auth and rate-limit statuses keep the
// friendly wording instead, and 5xx never surfaces upstream text.
const MESSAGE_SURFACING_STATUSES = new Set([400, 404, 409, 422]);
const MAX_SURFACED_MESSAGE_LENGTH = 200;

/**
 * Pull a user-safe message out of a structured API error body, if there is one.
 *
 * The API answers with JSON such as `{ error: "User already exists" }`, but the
 * same field also carries machine codes ("step_up_failed") and server internals,
 * so the value is only surfaced when it looks like operator-facing prose.
 */
function safeApiMessage(status: number, body: string): string | undefined {
  if (!MESSAGE_SURFACING_STATUSES.has(status)) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Unstructured bodies (proxy HTML, stack traces) are never safe to render.
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }

  const fields = parsed as Record<string, unknown>;
  const candidate = fields.error ?? fields.message;

  if (typeof candidate !== "string") {
    return undefined;
  }

  const message = candidate.trim();

  if (!message || message.length > MAX_SURFACED_MESSAGE_LENGTH) {
    return undefined;
  }

  // Machine codes like "step_up_failed" have no whitespace and are not written
  // for humans, so fall back to the friendly status message for those.
  if (!/\s/.test(message)) {
    return undefined;
  }

  return message;
}

function friendlyStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid. Check the values and try again.";
    case 401:
      return "Your session has expired. Sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "That change conflicts with the current state. Refresh and try again.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
  }

  if (status >= 500) {
    return "The Seamless Auth API had a problem. Try again shortly.";
  }

  return `The request failed (status ${status}).`;
}
