/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * A one-way channel from `apiFetch` to the React tree.
 *
 * A 401 can arrive from any hook on any screen, and a screen with several
 * panels produces several at once. Every one of them used to surface the same
 * "session has expired" text as a separate panel-level error while the console
 * stayed put, so an expired session read as the app being broken rather than as
 * being signed out.
 *
 * `apiFetch` cannot navigate, and the router is not reachable from it, so the
 * signal is published here and a component inside the router acts on it once.
 */
type Listener = () => void;

let listener: Listener | null = null;
let notified = false;

export function onSessionExpired(next: Listener) {
  listener = next;

  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

/**
 * Report an expired session. Repeat calls are dropped until
 * `resetSessionExpiryNotice` runs, so a screen that fires six requests at once
 * produces one redirect rather than six.
 */
export function notifySessionExpired() {
  if (notified) return;

  notified = true;
  listener?.();
}

/** Re-arm the notice. Called once the user is back on the sign-in screen. */
export function resetSessionExpiryNotice() {
  notified = false;
}
