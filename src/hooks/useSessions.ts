// src/hooks/useSessions.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiFetch("/admin/sessions"),
  });
}
