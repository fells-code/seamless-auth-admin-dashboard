/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

/* ---------- Types ---------- */

type UpdateUserInput = {
  email?: string;
  phone?: string;
  roles?: string[];
};

type User = {
  id: string;
  email: string;
  phone?: string | null;
  roles: string[];
  verified: boolean;
  createdAt: string;
};

/* ---------- Hook ---------- */

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();

  return useMutation<User, Error, UpdateUserInput>({
    mutationFn: (data) =>
      apiFetch<User>(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
