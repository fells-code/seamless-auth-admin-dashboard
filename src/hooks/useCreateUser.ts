import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
