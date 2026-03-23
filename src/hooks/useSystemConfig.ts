// src/hooks/useSystemConfig.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useSystemConfig() {
  return useQuery({
    queryKey: ["system-config"],
    queryFn: () => apiFetch("/system-config/admin"),
  });
}
