/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/hooks/useRevokeSession.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type RevokeSessionInput =
  | string
  | {
      id: string;
      userId?: string;
    };

export function useRevokeSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: RevokeSessionInput) => {
      const id = typeof input === "string" ? input : input.id;

      return apiFetch(`/admin/sessions/by-id/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_data, input) => {
      const userId = typeof input === "string" ? undefined : input.userId;

      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });

      if (userId) {
        qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      }
    },
  });
}
