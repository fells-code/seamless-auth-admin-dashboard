/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

const LAST_ROUTE_KEY = "last-protected-route";
const PUBLIC_AUTH_ROUTE_PATHS = [
  "/unauthenticated",
  "/login",
  "/verify-magiclink",
  "/oauth/callback",
  "/passKeyLogin",
  "/verifyPhoneOTP",
  "/verifyEmailOTP",
  "/registerPasskey",
  "/magiclinks-sent",
];

function getPathname(path: string) {
  return path.split(/[?#]/, 1)[0];
}

export function isProtectedRoutePath(path: unknown): path is string {
  if (typeof path !== "string") return false;

  const trimmed = path.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return false;
  }

  const pathname = getPathname(trimmed);

  return !PUBLIC_AUTH_ROUTE_PATHS.some(
    (publicRoute) =>
      pathname === publicRoute || pathname.startsWith(`${publicRoute}/`),
  );
}

export function resolveProtectedRoute(path: unknown, fallback = "/") {
  return isProtectedRoutePath(path) ? path.trim() : fallback;
}

export function saveLastProtectedRoute(path: string) {
  if (typeof window === "undefined") return;

  const protectedRoute = resolveProtectedRoute(path, "");
  if (!protectedRoute) return;

  sessionStorage.setItem(LAST_ROUTE_KEY, protectedRoute);
}

export function getLastProtectedRoute() {
  if (typeof window === "undefined") return "/";

  const stored = sessionStorage.getItem(LAST_ROUTE_KEY);

  return resolveProtectedRoute(stored);
}
