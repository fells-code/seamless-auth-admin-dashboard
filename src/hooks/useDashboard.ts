import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/internal/metrics/dashboard"),
  });
}
