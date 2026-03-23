// src/hooks/useRoles.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch("/system-config/roles"),
  });
}
