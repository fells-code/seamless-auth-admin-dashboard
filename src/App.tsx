/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/Layout";

import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Events from "./pages/Events";
import Security from "./pages/Security";
import Organizations from "./pages/Organizations";
import UserDetail from "./pages/UserDetail";
import SystemConfig from "./pages/SystemConfig";
import { AuthProvider } from "@seamless-auth/react";
import { getApiUrl } from "./lib/runtimeConfig";
import RequireAuth from "./components/RequireAuth";
import PublicAuthRoute from "./components/PublicAuthRoute";
import Unauthenticated from "./pages/Unauthenticated";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import MagicLinkVerification from "./pages/MagicLinkVerification";
import OAuthCallback from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import SessionExpiryHandler from "./components/SessionExpiryHandler";

export default function App() {
  const location = useLocation();

  return (
    <AuthProvider apiHost={getApiUrl()}>
      <SessionExpiryHandler />

      {/* Keyed on the path so navigating away from a screen that threw clears
          the error instead of pinning the console to it. */}
      <ErrorBoundary resetKey={location.pathname}>
        <Routes>
          <Route path="/unauthenticated" element={<Unauthenticated />} />
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <SignIn />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/verify-magiclink"
            element={
              <PublicAuthRoute>
                <MagicLinkVerification />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/oauth/callback"
            element={
              <PublicAuthRoute>
                <OAuthCallback />
              </PublicAuthRoute>
            }
          />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Overview />} />
            <Route path="/users" element={<Users />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/events" element={<Events />} />
            <Route path="/security" element={<Security />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/system" element={<SystemConfig />} />
            <Route path="/profile" element={<Profile />} />

            {/* Inside the shell, so an unrecognised address keeps the navigation
              rather than dropping the operator onto a bare screen. */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}
