/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useCallback } from "react";
import { useAuth } from "@seamless-auth/react";
import { useToast } from "./useToast";

export function useStepUpGuard() {
  const { refreshStepUpStatus, stepUpStatus, verifyStepUpWithPasskey } =
    useAuth();
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

        const { data: verified, error } = await verifyStepUpWithPasskey();
        const ok = !error && Boolean(verified?.fresh);
        if (!ok) {
          toast.error(
            "Step-up verification failed",
            "The action was not completed because passkey verification did not finish.",
          );
        }

        return ok;
      } catch {
        toast.error(
          "Step-up verification failed",
          "The action was not completed because the verification request failed.",
        );
        return false;
      }
    },
    [refreshStepUpStatus, stepUpStatus?.fresh, toast, verifyStepUpWithPasskey],
  );
}
