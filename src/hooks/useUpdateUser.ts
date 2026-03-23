import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-detail", userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
