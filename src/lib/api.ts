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
    throw new Error(`API error: ${res.status} ${text}`);
  }

  return res.json();
}
