/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useDeleteUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useDeleteUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/users/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.removeQueries({ queryKey: ["user-detail", userId] });
      qc.removeQueries({ queryKey: ["user-anomalies", userId] });
      qc.removeQueries({ queryKey: ["user-timeseries", userId] });
    },
  });
}
