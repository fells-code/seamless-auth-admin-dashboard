/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useRevokeAllUserSessions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/sessions/${userId}/revoke-all`, {
        method: "DELETE",
      }),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
