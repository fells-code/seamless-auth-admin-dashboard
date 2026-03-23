// src/hooks/useAuthTimeseries.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useAuthTimeseries() {
  return useQuery({
    queryKey: ["auth-timeseries"],
    queryFn: () => apiFetch("/internal/auth-events/timeseries?interval=hour"),
  });
}
