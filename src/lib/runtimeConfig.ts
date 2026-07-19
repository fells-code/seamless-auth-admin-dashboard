/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

declare global {
  interface Window {
    __SEAMLESS_CONFIG__?: {
      API_URL: string;
    };
  }
}

function isSameOriginMode(): boolean {
  return import.meta.env.VITE_SAME_ORIGIN === "true";
}

/**
 * Resolve the Seamless Auth API base URL.
 *
 * Precedence:
 * 1. Runtime injected config (nginx/Amplify container, `config.js`)
 * 2. Same-origin build: the page's own origin, so an auth instance can serve
 *    the dashboard and its API from one domain (passkeys and CORS just work)
 * 3. Baked `VITE_API_URL` for the standalone build
 */
export function getApiUrl(): string {
  const resolved = resolveApiUrl();

  if (!resolved) {
    throw new Error(
      "Seamless Auth API URL is not configured. Provide one of: " +
        "window.__SEAMLESS_CONFIG__.API_URL (runtime config.js), " +
        "VITE_SAME_ORIGIN=true, or a baked VITE_API_URL at build time.",
    );
  }

  if (!isValidHttpUrl(resolved)) {
    throw new Error(`Seamless Auth API URL is not a valid URL: ${resolved}`);
  }

  return resolved;
}

function resolveApiUrl(): string | undefined {
  if (window.__SEAMLESS_CONFIG__?.API_URL) {
    return window.__SEAMLESS_CONFIG__.API_URL;
  }

  if (isSameOriginMode()) {
    return window.location.origin;
  }

  return import.meta.env.VITE_API_URL;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Router basename derived from the Vite base path.
 *
 * `VITE_BASE_PATH` defaults to `/` for the root build and is set to `/console/`
 * for the auth-instance build. React Router wants no trailing slash, except for
 * the root where `/` is required.
 */
export function getBasePath(): string {
  const raw = import.meta.env.VITE_BASE_PATH ?? "/";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}
