/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type {
  SystemConfigPatch,
  UpdateSystemConfigResponse,
} from "@seamless-auth/types";

export function useUpdateSystemConfig() {
  const qc = useQueryClient();

  // The API exposes /system-config/admin as a partial update: its body schema is
  // strict and lists only the mutable keys, so the caller must send just the
  // changed fields. Echoing back the full config from the GET (which also carries
  // read-only keys such as frontend_url) is rejected as an invalid payload.
  return useMutation<UpdateSystemConfigResponse, Error, SystemConfigPatch>({
    mutationFn: (data) =>
      apiFetch<UpdateSystemConfigResponse>("/system-config/admin", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-config"] });
    },
  });
}
