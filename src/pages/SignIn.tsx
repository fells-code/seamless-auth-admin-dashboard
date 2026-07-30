/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyRound,
  Loader2,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import {
  useAuth,
  useAuthClient,
  usePasskeySupport,
  type LoginMethod,
} from "@seamless-auth/react";
import { getErrorMessage } from "../lib/errorMessage";
import OAuthProviderButtons from "../components/OAuthProviderButtons";
import { useLocation, useNavigate } from "react-router-dom";
import { getLastProtectedRoute, resolveProtectedRoute } from "../lib/lastRoute";
import { hasScopedRole } from "../lib/scopedRoles";
import { useToast } from "../hooks/useToast";

const DEFAULT_LOGIN_METHODS: LoginMethod[] = [
  "passkey",
  "magic_link",
  "phone_otp",
];

type LoginView = "identifier" | "fallback" | "emailOtp" | "phoneOtp" | "magic";
type BusyState =
  "idle" | "starting" | "passkey" | "magic" | "emailOtp" | "phoneOtp";

export default function SignIn() {
  const { markSignedIn, refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { loading: passkeySupportLoading, passkeySupported } =
    usePasskeySupport();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const magicCheckPending = useRef(false);

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [view, setView] = useState<LoginView>("identifier");
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState("");
  const [loginMethods, setLoginMethods] = useState<LoginMethod[]>(
    DEFAULT_LOGIN_METHODS,
  );

  const redirectTo = resolveProtectedRoute(
    (location.state as { from?: unknown } | null)?.from,
    getLastProtectedRoute(),
  );

  const completeSignIn = useCallback(async () => {
    markSignedIn();
    const { data } = await refreshSession();

    // Announcing success before this check produced a confirmation of an admin
    // session immediately followed by the route guard's no-access screen, which
    // contradicted it. Confirm the requirement first, then say so.
    if (!hasScopedRole(data?.user?.roles, "admin:read")) {
      toast.error(
        "Admin access required",
        "You are signed in, but this account does not have admin access.",
      );
      navigate("/unauthenticated", { replace: true });
      return;
    }

    toast.success("Signed in", "Admin session established.");
    navigate(redirectTo, { replace: true });
  }, [markSignedIn, navigate, redirectTo, refreshSession, toast]);

  const runPasskeyLogin = useCallback(
    async (availableMethods: LoginMethod[]) => {
      setBusy("passkey");

      const { error } = await authClient.loginWithPasskey();

      if (!error) {
        await completeSignIn();
        return;
      }

      setLoginMethods(availableMethods);
      setView("fallback");
      const message = getErrorMessage(error);
      setError(message);
      toast.error("Passkey sign-in failed", message);
      setBusy("idle");
    },
    [authClient, completeSignIn, toast],
  );

  const startLogin = async (preferPasskey = true) => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) return;

    setBusy("starting");
    setError("");
    setOtp("");

    try {
      const { data, error } = await authClient.login({
        identifier: trimmedIdentifier,
        passkeyAvailable: passkeySupported,
      });
      const availableMethods = data?.loginMethods?.length
        ? data.loginMethods
        : DEFAULT_LOGIN_METHODS;

      setLoginMethods(availableMethods);

      if (error) {
        const message = "Sign-in could not be started.";
        setError(message);
        toast.error("Sign-in failed", message);
        setBusy("idle");
        return;
      }

      if (
        preferPasskey &&
        passkeySupported &&
        availableMethods.includes("passkey")
      ) {
        await runPasskeyLogin(availableMethods);
        return;
      }

      setView("fallback");
      setBusy("idle");
    } catch {
      const message = "Sign-in could not be started.";
      setError(message);
      toast.error("Sign-in failed", message);
      setBusy("idle");
    }
  };

  const requestMagicLink = async () => {
    setBusy("magic");
    setError("");

    try {
      const { error } = await authClient.requestMagicLink();
      if (error) {
        const message = "Magic link could not be sent.";
        setError(message);
        toast.error("Magic link failed", message);
        setBusy("idle");
        return;
      }

      setView("magic");
      toast.success("Magic link sent", `Check ${identifier.trim()}.`);
      setBusy("idle");
    } catch {
      const message = "Magic link could not be sent.";
      setError(message);
      toast.error("Magic link failed", message);
      setBusy("idle");
    }
  };

  const requestEmailOtp = async () => {
    setBusy("emailOtp");
    setError("");

    try {
      const { error } = await authClient.requestLoginEmailOtp();
      if (error) {
        const message = "Email code could not be sent.";
        setError(message);
        toast.error("Email code failed", message);
        setBusy("idle");
        return;
      }

      setOtp("");
      setView("emailOtp");
      toast.success("Email code sent", `Check ${identifier.trim()}.`);
      setBusy("idle");
    } catch {
      const message = "Email code could not be sent.";
      setError(message);
      toast.error("Email code failed", message);
      setBusy("idle");
    }
  };

  const requestPhoneOtp = async () => {
    setBusy("phoneOtp");
    setError("");

    try {
      const { error } = await authClient.requestLoginPhoneOtp();
      if (error) {
        const message = "Text message code could not be sent.";
        setError(message);
        toast.error("Text code failed", message);
        setBusy("idle");
        return;
      }

      setOtp("");
      setView("phoneOtp");
      toast.success("Text code sent", `Check ${identifier.trim()}.`);
      setBusy("idle");
    } catch {
      const message = "Text message code could not be sent.";
      setError(message);
      toast.error("Text code failed", message);
      setBusy("idle");
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length < 6) {
      const message = "Enter the 6-character code.";
      setError(message);
      toast.warning("Verification code needed", message);
      return;
    }

    const nextBusy = view === "phoneOtp" ? "phoneOtp" : "emailOtp";
    setBusy(nextBusy);
    setError("");

    try {
      const { error } =
        view === "phoneOtp"
          ? await authClient.verifyLoginPhoneOtp(otp.trim())
          : await authClient.verifyLoginEmailOtp(otp.trim());

      if (error) {
        const message = "Code verification failed.";
        setError(message);
        toast.error("Verification failed", message);
        setBusy("idle");
        return;
      }

      await completeSignIn();
    } catch {
      const message = "Code verification failed.";
      setError(message);
      toast.error("Verification failed", message);
      setBusy("idle");
    }
  };

  const checkMagicLink = useCallback(async () => {
    if (magicCheckPending.current) return;
    magicCheckPending.current = true;

    try {
      const { data, error } = await authClient.checkMagicLink();
      // The poll answers 204 while the emailed link is unused and only reports
      // Success once consumed, so a bare no-error check would complete early.
      if (!error && data?.message === "Success") {
        await completeSignIn();
      }
    } catch {
      // Polling should remain quiet until the user takes action or the link is verified.
    } finally {
      magicCheckPending.current = false;
    }
  }, [authClient, completeSignIn]);

  useEffect(() => {
    if (view !== "magic") return;

    const channel = new BroadcastChannel("seamless-auth");
    channel.onmessage = (event) => {
      if (event.data?.type === "MAGIC_LINK_AUTH_SUCCESS") {
        void checkMagicLink();
      }
    };

    const interval = window.setInterval(() => void checkMagicLink(), 5000);

    return () => {
      window.clearInterval(interval);
      channel.close();
    };
  }, [checkMagicLink, view]);

  const canSubmitIdentifier = Boolean(identifier.trim());

  // The server decides which methods apply to an identifier. Re-deriving that
  // locally from strict email and phone patterns discarded methods the server
  // had offered, and the screen then reported that none were returned, which
  // was not true. The local patterns are gone rather than merely loosened.
  const canUseMagicLink = loginMethods.includes("magic_link");
  const canUseEmailOtp = loginMethods.includes("email_otp");
  const canUsePhoneOtp = loginMethods.includes("phone_otp");
  const canUsePasskey =
    loginMethods.includes("passkey") &&
    passkeySupported &&
    !passkeySupportLoading;
  // A passkey method the browser cannot service is still a method the server
  // offered, so it must not be reported as "nothing came back".
  const serverOfferedMethods = loginMethods.length > 0;
  const isBusy = busy !== "idle";

  const submitLabel =
    busy === "starting"
      ? "Checking..."
      : busy === "passkey"
        ? "Waiting For Passkey..."
        : "Continue";

  return (
    <div className="min-h-screen bg-base text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,0.6fr)] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs text-muted">
              <ShieldCheck size={14} />
              <span>Seamless Auth Dashboard</span>
            </div>

            <div className="space-y-3">
              <h1 className="heading-1">Admin Sign In</h1>
              <p className="max-w-2xl text-sm text-muted">
                Use an admin account to enter the operator console.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-subtle bg-surface p-6 shadow-lg">
            {view === "identifier" || view === "fallback" ? (
              <form
                className="space-y-5"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void startLogin(true);
                }}
              >
                <div className="space-y-2">
                  <label
                    htmlFor="identifier"
                    className="text-xs uppercase tracking-[0.18em] text-muted"
                  >
                    Email or phone
                  </label>
                  <input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setView("identifier");
                      setError("");
                    }}
                    placeholder="admin@example.com or +15551234567"
                    autoComplete="username webauthn"
                    disabled={isBusy}
                    className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmitIdentifier || isBusy}
                  className="btn btn-primary w-full justify-center disabled:opacity-50"
                >
                  {isBusy && <Loader2 size={16} className="animate-spin" />}
                  {submitLabel}
                </button>

                {view === "fallback" && (
                  <div className="space-y-3 rounded-xl border border-subtle bg-surface-alt p-3">
                    {canUsePasskey && (
                      <FallbackButton
                        icon={KeyRound}
                        label="Use Passkey"
                        onClick={() => void startLogin(true)}
                      />
                    )}
                    {canUseMagicLink && (
                      <FallbackButton
                        icon={Mail}
                        label="Send Magic Link"
                        onClick={() => void requestMagicLink()}
                      />
                    )}
                    {canUseEmailOtp && (
                      <FallbackButton
                        icon={Mail}
                        label="Send Email Code"
                        onClick={() => void requestEmailOtp()}
                      />
                    )}
                    {canUsePhoneOtp && (
                      <FallbackButton
                        icon={MessageSquareText}
                        label="Send Text Code"
                        onClick={() => void requestPhoneOtp()}
                      />
                    )}
                    {!canUsePasskey &&
                      !canUseMagicLink &&
                      !canUseEmailOtp &&
                      !canUsePhoneOtp &&
                      (serverOfferedMethods ? (
                        <p className="text-sm text-muted">
                          The sign-in methods available for this account cannot
                          be used in this browser. Try another browser or
                          device, or use a provider below.
                        </p>
                      ) : (
                        <p className="text-sm text-muted">
                          No available sign-in method was returned for this
                          identifier.
                        </p>
                      ))}
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-5">
                {view === "magic" ? (
                  <MagicLinkState
                    identifier={identifier}
                    busy={isBusy}
                    resending={busy === "magic"}
                    onChangeIdentifier={() => {
                      setView("identifier");
                      setError("");
                    }}
                    onResend={() => void requestMagicLink()}
                  />
                ) : (
                  <OtpState
                    busy={isBusy}
                    channel={view === "phoneOtp" ? "phone" : "email"}
                    otp={otp}
                    setOtp={setOtp}
                    onBack={() => {
                      setView("fallback");
                      setError("");
                    }}
                    onResend={() =>
                      view === "phoneOtp"
                        ? void requestPhoneOtp()
                        : void requestEmailOtp()
                    }
                    onVerify={() => void verifyOtp()}
                  />
                )}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-md border border-[color:var(--highlight)]/30 bg-[color:var(--highlight)]/10 px-3 py-2 text-sm text-[var(--highlight)]"
              >
                {error}
              </div>
            )}

            {(view === "identifier" || view === "fallback") && (
              <div className="mt-5">
                <OAuthProviderButtons />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function FallbackButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md border border-subtle bg-surface px-3 py-2 text-left text-sm transition hover:bg-[var(--surface-alt)]"
    >
      <span className="inline-flex items-center gap-2">
        <Icon size={16} />
        <span>{label}</span>
      </span>
      <span className="text-muted">Continue</span>
    </button>
  );
}

function OtpState({
  busy,
  channel,
  otp,
  setOtp,
  onBack,
  onResend,
  onVerify,
}: {
  busy: boolean;
  channel: "email" | "phone";
  otp: string;
  setOtp: (value: string) => void;
  onBack: () => void;
  onResend: () => void;
  onVerify: () => void;
}) {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onVerify();
      }}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {channel === "phone" ? "Text Message Code" : "Email Code"}
        </h2>
        <p className="text-sm text-muted">Enter the verification code.</p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="otp"
          className="text-xs uppercase tracking-[0.18em] text-muted"
        >
          Verification code
        </label>
        <input
          id="otp"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          autoComplete="one-time-code"
          disabled={busy}
          className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="btn btn-secondary disabled:opacity-50"
        >
          Back
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResend}
            disabled={busy}
            className="btn btn-secondary disabled:opacity-50"
          >
            Resend
          </button>
          <button
            type="submit"
            disabled={busy || otp.trim().length < 6}
            className="btn btn-primary disabled:opacity-50"
          >
            Verify
          </button>
        </div>
      </div>
    </form>
  );
}

function MagicLinkState({
  identifier,
  busy,
  resending,
  onChangeIdentifier,
  onResend,
}: {
  identifier: string;
  busy: boolean;
  resending: boolean;
  onChangeIdentifier: () => void;
  onResend: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Check Your Email
        </h2>
        <p className="text-sm text-muted">
          A sign-in link was sent to {identifier}.
        </p>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={onChangeIdentifier}
          disabled={busy}
          className="btn btn-secondary disabled:opacity-50"
        >
          Change
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={busy}
          className="btn btn-primary justify-center disabled:opacity-50"
        >
          {resending && <Loader2 size={16} className="animate-spin" />}
          {resending ? "Sending..." : "Resend"}
        </button>
      </div>
    </div>
  );
}
