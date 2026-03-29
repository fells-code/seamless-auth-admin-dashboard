/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type CreateUserInput = {
  email: string;
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

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation<User, Error, CreateUserInput>({
    mutationFn: (data) =>
      apiFetch<User>("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
