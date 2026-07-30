/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  getOAuthErrorCode,
  useAuth,
  useAuthClient,
  type OAuthErrorCode,
} from "@seamless-auth/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getLastProtectedRoute } from "../lib/lastRoute";
import { OAUTH_PROVIDER_STORAGE_KEY } from "../components/OAuthProviderButtons";

const OAUTH_ERROR_MESSAGES: Record<OAuthErrorCode, string> = {
  oauth_missing_email:
    "The provider did not return an email address for this account. Add one to the provider account, or sign in with another method.",
  oauth_email_not_verified:
    "The provider reports this account's email address as unverified. Verify it with the provider, then try again.",
  oauth_missing_subject:
    "The provider did not return an account identifier, so the account could not be matched. Try signing in again.",
};

const GENERIC_OAUTH_ERROR =
  "We could not complete sign-in. Try signing in again.";

export default function OAuthCallback() {
  const authClient = useAuthClient();
  const { markSignedIn, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  // The provider round-trip fires this effect twice under StrictMode; the guard
  // keeps finishOAuthLogin from running against an already-consumed code.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let active = true;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const providerId = sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY);

    async function finish() {
      if (!code || !state || !providerId) {
        setError("This sign-in link is missing required information.");
        return;
      }

      const { error: finishError } = await authClient.finishOAuthLogin({
        providerId,
        code,
        state,
      });

      if (finishError) {
        const code = getOAuthErrorCode(finishError);
        setError(code ? OAUTH_ERROR_MESSAGES[code] : GENERIC_OAUTH_ERROR);
        return;
      }

      sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
      markSignedIn();
      await refreshSession();

      if (active) {
        navigate(getLastProtectedRoute(), { replace: true });
      }
    }

    void finish();

    return () => {
      active = false;
    };
  }, [authClient, markSignedIn, navigate, refreshSession, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6 text-primary">
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-6 text-center shadow-lg">
        <div
          className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt ${
            error ? "text-[var(--highlight)]" : "text-[var(--primary)]"
          }`}
        >
          {error ? (
            <ShieldAlert size={22} />
          ) : (
            <Loader2 className="animate-spin" size={22} />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {error ? "Sign-in Failed" : "Completing Sign In"}
          </h1>
          <p className="text-sm text-muted">
            {error || "Finishing the secure sign-in request."}
          </p>

          {error && (
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="btn btn-secondary mt-2"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
