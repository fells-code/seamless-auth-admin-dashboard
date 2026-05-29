/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { SystemConfig } from "./useSystemConfig";

export function useUpdateSystemConfig() {
  const qc = useQueryClient();

  return useMutation<SystemConfig, Error, SystemConfig>({
    mutationFn: (data) =>
      apiFetch<SystemConfig>("/system-config/admin", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-config"] });
    },
  });
}
