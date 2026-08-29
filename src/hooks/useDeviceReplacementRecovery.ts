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

// The user id travels in the path rather than the body. The clearing steps stay
// Partial because the server applies its own defaults for any left out, but
// proofing is required: the server refuses a recovery that records no identity
// proofing, and making it optional here hides that at compile time.
type DeviceReplacementRecoveryInput = Partial<
  Omit<DeviceReplacementRecoveryRequest, "proofing">
> &
  Pick<DeviceReplacementRecoveryRequest, "proofing"> & {
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
