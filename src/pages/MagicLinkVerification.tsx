/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth, useAuthClient } from "@seamless-auth/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getLastProtectedRoute } from "../lib/lastRoute";

export default function MagicLinkVerification() {
  const authClient = useAuthClient();
  const { markSignedIn, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const token = searchParams.get("token");

    async function verify() {
      if (!token) {
        setError("Missing magic-link token.");
        return;
      }

      try {
        const response = await authClient.verifyMagicLink(token);
        if (!response.ok) {
          throw new Error("Magic-link verification failed.");
        }

        const channel = new BroadcastChannel("seamless-auth");
        channel.postMessage({ type: "MAGIC_LINK_AUTH_SUCCESS" });
        channel.close();

        markSignedIn();
        await refreshSession();

        if (active) {
          navigate(getLastProtectedRoute(), { replace: true });
        }
      } catch {
        if (active) {
          setError("Magic-link verification failed.");
        }
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [authClient, markSignedIn, navigate, refreshSession, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6 text-primary">
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-[var(--primary)]">
          {error ? (
            <ShieldCheck size={22} />
          ) : (
            <Loader2 className="animate-spin" size={22} />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {error ? "Verification Failed" : "Finishing Sign In"}
          </h1>
          <p className="text-sm text-muted">
            {error || "Completing the secure sign-in request."}
          </p>
        </div>
      </div>
    </div>
  );
}
