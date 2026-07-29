/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ApiUser, CreateUserRequest } from "@seamless-auth/types";

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation<ApiUser, Error, CreateUserRequest>({
    mutationFn: (data) =>
      apiFetch<ApiUser>("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
