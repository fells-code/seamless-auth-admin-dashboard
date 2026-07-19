/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { getApiUrl } from "./runtimeConfig";

export const API_URL = getApiUrl();

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");

  const baseUrl = API_URL.replace(/\/+$/, "");
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
  // Keep the raw upstream detail in the console for debugging, but never render
  // it in the UI where it could leak backend internals.
  if (body) {
    console.error(`API error ${status} on ${path}: ${body}`);
  }

  if (body.includes("missing bearer token")) {
    return [
      "The Seamless Auth API expected an Authorization bearer token.",
      "This dashboard should call the Seamless Auth server adapter, which reads the dashboard session cookie and forwards the bearer token upstream.",
      `Check that API_URL points at the server-adapter origin and that the adapter forwards ${path}.`,
    ].join(" ");
  }

  return friendlyStatusMessage(status);
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
