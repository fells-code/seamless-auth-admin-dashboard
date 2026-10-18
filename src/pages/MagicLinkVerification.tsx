/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth, useAuthClient } from "@seamless-auth/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getLastProtectedRoute } from "../lib/lastRoute";
import {
  getMagicLinkConfirmation,
  type MagicLinkConfirmation,
} from "../lib/magicLinkConfirmation";
import { useToast } from "../hooks/useToast";

export default function MagicLinkVerification() {
  const authClient = useAuthClient();
  const { markSignedIn, refreshSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] =
    useState<MagicLinkConfirmation | null>(null);
  const [outcome, setOutcome] = useState<"approved" | "declined" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    let active = true;
    const token = searchParams.get("token");

    async function verify() {
      if (!token) {
        const message = "Missing magic-link token.";
        setError(message);
        toast.error("Magic-link verification failed", message);
        return;
      }

      try {
        const { error } = await authClient.verifyMagicLink(token);
        if (error) {
          const pending = getMagicLinkConfirmation(error);
          if (pending) {
            // Opened on another device: the link is unused, and this device holds
            // no session to collect, so it asks before anything is signed in.
            if (active) setConfirmation(pending);
            return;
          }
          throw new Error("Magic-link verification failed.");
        }

        const channel = new BroadcastChannel("seamless-auth");
        channel.postMessage({ type: "MAGIC_LINK_AUTH_SUCCESS" });
        channel.close();

        markSignedIn();
        await refreshSession();
        toast.success("Signed in", "Magic-link verification completed.");

        if (active) {
          navigate(getLastProtectedRoute(), { replace: true });
        }
      } catch {
        if (active) {
          const message = "Magic-link verification failed.";
          setError(message);
          toast.error("Magic-link verification failed", message);
        }
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [authClient, markSignedIn, navigate, refreshSession, searchParams, toast]);

  async function approve() {
    const token = searchParams.get("token");
    if (!token) return;

    setConfirming(true);
    setConfirmError("");
    const { error } = await authClient.confirmMagicLink(token);
    setConfirming(false);

    if (error) {
      setConfirmError(
        "The sign-in could not be approved. The link may have expired.",
      );
      return;
    }

    setOutcome("approved");
  }

  if (confirmation) {
    const when = confirmation.requestedAt
      ? ` on ${confirmation.requestedAt.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}`
      : "";

    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-6 text-primary">
        <div className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-6 text-center shadow-lg">
          <div className="space-y-3">
            <h1 className="text-lg font-semibold tracking-tight">
              {outcome === "approved"
                ? "Sign-in approved"
                : outcome === "declined"
                  ? "Nothing was signed in"
                  : "Confirm this sign-in"}
            </h1>

            {outcome === "approved" ? (
              <p role="status" className="text-sm text-muted">
                Return to your other device to continue.
              </p>
            ) : outcome === "declined" ? (
              <p role="status" className="text-sm text-muted">
                No one was signed in. You can ignore the email.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted">
                  A sign-in to the admin console was requested from{" "}
                  {confirmation.deviceLabel}
                  {when}. Approve it only if that was you.
                </p>
                {confirmError && (
                  <p role="alert" className="text-sm text-[var(--highlight)]">
                    {confirmError}
                  </p>
                )}
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void approve()}
                    disabled={confirming}
                    className="btn btn-primary"
                  >
                    Yes, sign in that device
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome("declined")}
                    disabled={confirming}
                    className="btn btn-secondary"
                  >
                    No, this wasn&apos;t me
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            {error ? "Verification Failed" : "Finishing Sign In"}
          </h1>

          {error ? (
            <>
              <p role="alert" className="text-sm text-muted">
                {error} The link may have expired or already been used.
              </p>

              {/* Without this the screen was a dead end: the only escape was
                  editing the URL. The OAuth callback already offers a way back. */}
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="btn btn-secondary mt-2"
              >
                Back to sign in
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">
              Completing the secure sign-in request.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
