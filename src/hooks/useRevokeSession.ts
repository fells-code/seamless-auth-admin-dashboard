// src/hooks/useRevokeSession.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useRevokeSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/sessions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
