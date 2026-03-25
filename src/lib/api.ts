export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5312";
const API_SERVICE_TOKEN = import.meta.env.VITE_API_SERVICE_TOKEN;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");

  if (API_SERVICE_TOKEN) {
    headers.set("Authorization", `Bearer ${API_SERVICE_TOKEN}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${text}`);
  }

  return res.json();
}
