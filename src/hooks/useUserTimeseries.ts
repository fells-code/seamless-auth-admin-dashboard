import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useUserTimeseries(userId: string) {
  return useQuery({
    queryKey: ["user-timeseries", userId],
    queryFn: () =>
      apiFetch(
        `/internal/auth-events/timeseries?interval=hour&userId=${userId}`,
      ),
    enabled: !!userId,
  });
}
