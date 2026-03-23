import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useGroupedEvents() {
  return useQuery({
    queryKey: ["grouped-events"],
    queryFn: () => apiFetch("/internal/auth-events/grouped"),
  });
}
