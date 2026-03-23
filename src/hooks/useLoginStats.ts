// src/hooks/useLoginStats.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useLoginStats() {
  return useQuery({
    queryKey: ["loginStats"],
    queryFn: () => apiFetch("/internal/auth-events/login-stats"),
  });
}
