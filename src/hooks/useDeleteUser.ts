// src/hooks/useDeleteUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useDeleteUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch("/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
