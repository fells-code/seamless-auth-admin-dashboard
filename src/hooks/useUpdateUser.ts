/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ApiUser, UpdateUserRequest } from "@seamless-auth/types";

/* ---------- Helpers ---------- */

/**
 * The edit forms model "no phone" as an empty string, but the API accepts a
 * phone number or null and rejects "". Sending it through unchanged failed the
 * whole request, so editing anything else (a role, say) on a user without a
 * phone was impossible. Null is how the API clears the field, which is what an
 * emptied input means.
 */
function normalizeUpdateUserInput({
  phone,
  ...rest
}: UpdateUserRequest): UpdateUserRequest {
  if (phone === undefined) {
    return rest;
  }

  const trimmed = phone?.trim();

  return { ...rest, phone: trimmed ? trimmed : null };
}

/* ---------- Hook ---------- */

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();

  return useMutation<ApiUser, Error, UpdateUserRequest>({
    mutationFn: (data) =>
      apiFetch<ApiUser>(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(normalizeUpdateUserInput(data)),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
