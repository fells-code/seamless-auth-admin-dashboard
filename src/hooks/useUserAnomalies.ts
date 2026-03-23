import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { UserAnomalies } from "../types/user";

export function useUserAnomalies(userId: string) {
  return useQuery<UserAnomalies>({
    queryKey: ["user-anomalies", userId],
    queryFn: () => apiFetch(`/admin/users/${userId}/anomalies`),
    enabled: !!userId,
  });
}
