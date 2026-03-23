// src/hooks/useEventSummary.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useEventSummary() {
  return useQuery({
    queryKey: ["event-summary"],
    queryFn: () => apiFetch("/internal/auth-events/summary"),
  });
}
