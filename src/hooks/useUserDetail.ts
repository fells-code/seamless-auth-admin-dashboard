import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { UserDetailResponse } from "../types/user";

export function useUserDetail(userId: string) {
  return useQuery<UserDetailResponse>({
    queryKey: ["user-detail", userId],
    queryFn: () => apiFetch(`/admin/users/${userId}`),
    enabled: !!userId,
  });
}
