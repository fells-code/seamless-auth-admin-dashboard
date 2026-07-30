/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect } from "react";
import { useAuth } from "@seamless-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  onSessionExpired,
  resetSessionExpiryNotice,
} from "../lib/sessionExpiry";
import { saveLastProtectedRoute } from "../lib/lastRoute";
import { useToast } from "../hooks/useToast";

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/verify-magiclink",
  "/oauth/callback",
  "/unauthenticated",
];

/**
 * Turns a 401 from any hook into a single sign-out, once.
 *
 * Renders nothing. It exists inside the router because `apiFetch` publishes the
 * signal from outside React and cannot navigate.
 */
export default function SessionExpiryHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();
  const toast = useToast();

  useEffect(() => {
    return onSessionExpired(() => {
      // Already on a public auth screen: a 401 there is the expected answer for
      // an anonymous visitor, not an expired session to react to.
      if (
        PUBLIC_AUTH_PATHS.some((path) => location.pathname.startsWith(path))
      ) {
        resetSessionExpiryNotice();
        return;
      }

      saveLastProtectedRoute(location.pathname + location.search);

      // The SDK clears its session locally when the user check fails, so this
      // reconciles its state without sending a logout for a session the server
      // has already rejected.
      void refreshSession();
      queryClient.clear();

      toast.warning(
        "Session expired",
        "Sign in again to continue where you left off.",
      );

      navigate("/login", { replace: true });
      resetSessionExpiryNotice();
    });
  }, [location, navigate, queryClient, refreshSession, toast]);

  return null;
}
