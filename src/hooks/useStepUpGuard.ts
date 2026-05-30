/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useCallback } from "react";
import { useAuth } from "@seamless-auth/react";

export function useStepUpGuard() {
  const { refreshStepUpStatus, stepUpStatus, verifyStepUpWithPasskey } =
    useAuth();

  return useCallback(
    async function ensureStepUp() {
      if (stepUpStatus?.fresh) {
        return true;
      }

      try {
        const status = await refreshStepUpStatus();
        if (status?.fresh) {
          return true;
        }

        const result = await verifyStepUpWithPasskey();
        return result.success;
      } catch {
        return false;
      }
    },
    [refreshStepUpStatus, stepUpStatus?.fresh, verifyStepUpWithPasskey],
  );
}
