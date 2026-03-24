// src/hooks/useEvents.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

function expandType(type?: string) {
  if (!type) return [];

  if (type === "login") return ["login_success", "login_failed"];
  if (type === "otp") return ["otp_success", "otp_failed"];
  if (type === "webauthn")
    return ["webauthn_login_success", "webauthn_login_failed"];
  if (type === "magicLink")
    return ["magic_link_success", "magic_link_requested"];

  return [type];
}

export function useEvents(params: {
  limit?: number;
  offset?: number;
  type?: string;
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();

  const types = expandType(params.type);

  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (types) types.forEach((t) => query.append("type", t));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  return useQuery({
    queryKey: ["events", params],
    queryFn: () =>
      apiFetch<{ events: any; total: number }>(
        `/admin/auth-events?${query.toString()}`,
      ),
  });
}
