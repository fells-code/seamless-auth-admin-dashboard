/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useCallback, useContext } from "react";
import {
  getWebAuthnErrorDetail,
  useAuth,
  useAuthClient,
} from "@seamless-auth/react";
import { TotpPromptContext } from "../lib/totpPromptContext";
import { getErrorMessage } from "../lib/errorMessage";
import { useToast } from "./useToast";

export function useStepUpGuard() {
  const {
    credentials,
    refreshStepUpStatus,
    stepUpStatus,
    verifyStepUpWithPasskey,
    verifyStepUpWithTotp,
  } = useAuth();
  const authClient = useAuthClient();
  const promptForTotp = useContext(TotpPromptContext);
  const toast = useToast();

  return useCallback(
    async function ensureStepUp() {
      if (stepUpStatus?.fresh) {
        return true;
      }

      try {
        const { data: status } = await refreshStepUpStatus();
        if (status?.fresh) {
          return true;
        }

        const hasPasskey = (credentials?.length ?? 0) > 0;

        // An account with no passkey cannot satisfy a WebAuthn ceremony: the
        // API answers /step-up/webauthn/start with an empty allowCredentials
        // and userVerification "required", so navigator.credentials.get() has
        // nothing to assert and throws. Going straight there produced a generic
        // "Step-up verification failed" with no cause and no way forward. This
        // is routine with OAuth, where an admin may never have enrolled one.
        if (hasPasskey) {
          const { data: verified, error } = await verifyStepUpWithPasskey();

          if (!error && verified?.fresh) {
            return true;
          }

          const detail = getWebAuthnErrorDetail(error);

          // A dismissed prompt is the user's own choice, not a misconfiguration,
          // so it must not be reported as a failure needing investigation.
          if (detail?.name === "NotAllowedError") {
            toast.warning(
              "Verification cancelled",
              "The action was not completed because passkey verification was dismissed or timed out.",
            );
            return false;
          }

          if (detail?.name === "SecurityError") {
            toast.error(
              "Passkey verification blocked",
              "This origin or relying-party ID does not match the one your passkeys were registered against. Check the WebAuthn settings in System Configuration.",
            );
            return false;
          }

          // Fall through to TOTP rather than stopping here: the passkey may be
          // unusable on this device while the account still has a second factor.
        }

        const { data: totp } = await authClient.getTotpStatus();

        if (totp?.enabled) {
          const code = await promptForTotp();

          if (!code) {
            return false;
          }

          const { data: verified, error } = await verifyStepUpWithTotp(code);

          if (!error && verified?.fresh) {
            return true;
          }

          toast.error(
            "Verification failed",
            error
              ? getErrorMessage(error)
              : "That code was not accepted. Check your authenticator app and try again.",
          );
          return false;
        }

        if (!hasPasskey) {
          toast.error(
            "A security key or authenticator is required",
            "This action needs step-up verification, and this account has no passkey or authenticator app enrolled. Add one from your profile, then try again.",
          );
          return false;
        }

        toast.error(
          "Step-up verification failed",
          "The action was not completed because passkey verification did not finish, and no authenticator app is enrolled as a fallback.",
        );
        return false;
      } catch (error) {
        toast.error("Step-up verification failed", getErrorMessage(error));
        return false;
      }
    },
    [
      authClient,
      credentials,
      promptForTotp,
      refreshStepUpStatus,
      stepUpStatus?.fresh,
      toast,
      verifyStepUpWithPasskey,
      verifyStepUpWithTotp,
    ],
  );
}
