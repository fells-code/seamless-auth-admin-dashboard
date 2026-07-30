/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useState } from "react";
import { useHref } from "react-router-dom";
import { useAuthClient, type OAuthProvider } from "@seamless-auth/react";
import { getErrorMessage } from "../lib/errorMessage";

/**
 * The chosen provider id is stashed here before the browser leaves for the
 * provider, because the callback URL only carries `code` and `state`. The
 * callback reads it back. Keep this key in sync with OAuthCallback.
 */
export const OAUTH_PROVIDER_STORAGE_KEY = "seamless:oauth:provider";

export default function OAuthProviderButtons() {
  const authClient = useAuthClient();
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  // The callback route is fixed and registered with the OAuth providers as an
  // allowed redirect URI. useHref applies the router basename so the /console
  // build sends /console/oauth/callback rather than /oauth/callback.
  const callbackHref = useHref("/oauth/callback");

  useEffect(() => {
    let active = true;

    void authClient
      .listOAuthProviders()
      .then(({ data }) => {
        if (active) setProviders(data?.providers ?? []);
      })
      .catch(() => {
        if (active) setProviders([]);
      });

    return () => {
      active = false;
    };
  }, [authClient]);

  // Render nothing unless the instance has OAuth configured, so the login page
  // stays clean when no providers are available.
  if (providers.length === 0) {
    return null;
  }

  const startProvider = async (provider: OAuthProvider) => {
    setPending(provider.id);
    setError("");

    // Every failure path here used to return silently, so the button reverted
    // from "Redirecting..." to its label with no message and the operator could
    // not tell whether the click had registered.
    const fail = (message: string) => {
      sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
      setPending(null);
      setError(message);
    };

    try {
      sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, provider.id);

      const redirectUri = new URL(
        callbackHref,
        window.location.origin,
      ).toString();

      const { data, error: startError } = await authClient.startOAuthLogin({
        providerId: provider.id,
        redirectUri,
      });

      if (startError || !data) {
        fail(
          `${provider.name} sign-in could not be started. ${getErrorMessage(startError)}`,
        );
        return;
      }

      window.location.assign(data.authorizationUrl);
    } catch (caught) {
      fail(
        `${provider.name} sign-in could not be started. ${getErrorMessage(caught)}`,
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted">
        <span className="h-px flex-1 bg-subtle" />
        or continue with
        <span className="h-px flex-1 bg-subtle" />
      </div>

      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={pending !== null}
          onClick={() => void startProvider(provider)}
          className="btn btn-secondary w-full disabled:opacity-60"
        >
          {pending === provider.id
            ? "Redirecting..."
            : `Continue with ${provider.name}`}
        </button>
      ))}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-[color:var(--highlight)]/30 bg-[color:var(--highlight)]/10 px-3 py-2 text-sm text-[var(--highlight)]"
        >
          {error}
        </div>
      )}
    </div>
  );
}
