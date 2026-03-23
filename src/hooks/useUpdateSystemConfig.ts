// src/hooks/useUpdateSystemConfig.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useUpdateSystemConfig() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/system-config/admin", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-config"] });
    },
  });
}
