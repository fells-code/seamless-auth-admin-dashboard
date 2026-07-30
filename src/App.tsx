/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router-dom";
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
import { getApiUrl, getBasePath } from "./lib/runtimeConfig";
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

/**
 * Everything that has to sit inside the router but outside the routes.
 *
 * AuthProvider lives here rather than around RouterProvider because the router
 * is created once at module scope, while the provider needs to be part of the
 * React tree the routes render into.
 */
function Root() {
  const location = useLocation();

  return (
    <AuthProvider apiHost={getApiUrl()}>
      <SessionExpiryHandler />

      {/* Keyed on the path so navigating away from a screen that threw clears
          the error instead of pinning the console to it. */}
      <ErrorBoundary resetKey={location.pathname}>
        <Outlet />
      </ErrorBoundary>
    </AuthProvider>
  );
}

// A data router, not <BrowserRouter>. useBlocker, which backs the unsaved
// changes guard on the system configuration screen, is only available on one.
const router = createBrowserRouter(
  [
    {
      element: <Root />,
      children: [
        { path: "/unauthenticated", element: <Unauthenticated /> },
        {
          path: "/login",
          element: (
            <PublicAuthRoute>
              <SignIn />
            </PublicAuthRoute>
          ),
        },
        {
          path: "/verify-magiclink",
          element: (
            <PublicAuthRoute>
              <MagicLinkVerification />
            </PublicAuthRoute>
          ),
        },
        {
          path: "/oauth/callback",
          element: (
            <PublicAuthRoute>
              <OAuthCallback />
            </PublicAuthRoute>
          ),
        },
        {
          element: (
            <RequireAuth>
              <Layout />
            </RequireAuth>
          ),
          children: [
            { path: "/", element: <Overview /> },
            { path: "/users", element: <Users /> },
            { path: "/organizations", element: <Organizations /> },
            { path: "/sessions", element: <Sessions /> },
            { path: "/events", element: <Events /> },
            { path: "/security", element: <Security /> },
            { path: "/users/:id", element: <UserDetail /> },
            { path: "/system", element: <SystemConfig /> },
            { path: "/profile", element: <Profile /> },

            // Inside the shell, so an unrecognised address keeps the navigation
            // rather than dropping the operator onto a bare screen.
            { path: "*", element: <NotFound /> },
          ],
        },
      ],
    },
  ],
  { basename: getBasePath() },
);

export default function App() {
  return <RouterProvider router={router} />;
}
