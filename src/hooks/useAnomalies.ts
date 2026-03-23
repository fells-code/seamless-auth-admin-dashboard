// src/hooks/useAnomalies.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useAnomalies() {
  return useQuery({
    queryKey: ["anomalies"],
    queryFn: () => apiFetch("/internal/security/anomalies"),
  });
}
