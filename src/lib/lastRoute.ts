/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

const LAST_ROUTE_KEY = "last-protected-route";

export function saveLastProtectedRoute(path: string) {
  if (typeof window === "undefined") return;

  if (!path || path === "/unauthenticated") return;

  sessionStorage.setItem(LAST_ROUTE_KEY, path);
}

export function getLastProtectedRoute() {
  if (typeof window === "undefined") return "/";

  const stored = sessionStorage.getItem(LAST_ROUTE_KEY);

  if (!stored || stored === "/unauthenticated") {
    return "/";
  }

  return stored;
}
