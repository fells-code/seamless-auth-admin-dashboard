/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type {
  DeviceReplacementRecoveryRequest,
  DeviceReplacementRecoveryResponse,
} from "@seamless-auth/types";

// The user id travels in the path rather than the body. Every recovery step is
// Partial because the server applies its own defaults for any step left out,
// and DeviceReplacementRecoveryRequest models the parsed body, where those
// defaults have already been filled in.
type DeviceReplacementRecoveryInput =
  Partial<DeviceReplacementRecoveryRequest> & {
    userId: string;
  };

export function useDeviceReplacementRecovery() {
  const qc = useQueryClient();

  return useMutation<
    DeviceReplacementRecoveryResponse,
    Error,
    DeviceReplacementRecoveryInput
  >({
    mutationFn: ({ userId, ...body }) =>
      apiFetch<DeviceReplacementRecoveryResponse>(
        `/admin/users/${userId}/recovery/device-replacement`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["user-detail", variables.userId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
