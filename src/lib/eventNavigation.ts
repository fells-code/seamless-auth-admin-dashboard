// src/lib/eventNavigation.ts
export function buildEventQuery(params: {
  type?: string;
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();

  if (params.type) query.set("type", params.type);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  return `/events?${query.toString()}`;
}
