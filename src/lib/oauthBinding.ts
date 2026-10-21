/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * The auth server ties each OAuth `state` to the client that started the
 * sign-in: `/start` returns a `binding` that the callback has to send back.
 * It is kept with its state, so a binding left over from an abandoned attempt
 * is never sent with another one.
 */
const OAUTH_BINDING_STORAGE_KEY = "seamless:oauth:binding";

export function storeOAuthBinding(state: string, binding: string | undefined) {
  try {
    if (binding) {
      sessionStorage.setItem(
        OAUTH_BINDING_STORAGE_KEY,
        JSON.stringify({ state, binding }),
      );
    } else {
      sessionStorage.removeItem(OAUTH_BINDING_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable, for example in private mode.
  }
}

export function readOAuthBinding(state: string): string | undefined {
  try {
    const raw = sessionStorage.getItem(OAUTH_BINDING_STORAGE_KEY);
    if (!raw) return undefined;

    const stored = JSON.parse(raw) as { state?: unknown; binding?: unknown };
    return stored.state === state && typeof stored.binding === "string"
      ? stored.binding
      : undefined;
  } catch {
    return undefined;
  }
}

export function clearOAuthBinding() {
  try {
    sessionStorage.removeItem(OAUTH_BINDING_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
