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
  phone?: string | null;
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
}: UpdateUserInput): UpdateUserInput {
  if (phone === undefined) {
    return rest;
  }

  const trimmed = phone?.trim();

  return { ...rest, phone: trimmed ? trimmed : null };
}

/* ---------- Hook ---------- */

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();

  return useMutation<User, Error, UpdateUserInput>({
    mutationFn: (data) =>
      apiFetch<User>(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(normalizeUpdateUserInput(data)),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
