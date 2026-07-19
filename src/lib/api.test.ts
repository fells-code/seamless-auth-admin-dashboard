/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";

vi.mock("./runtimeConfig", () => ({
  getApiUrl: () => "https://api.example.com/",
}));

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefixes requests with the auth adapter path and parses JSON", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await expect(apiFetch<{ ok: boolean }>("/admin/users")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/auth/admin/users",
      expect.objectContaining({
        credentials: "include",
      }),
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("does not try to parse an empty successful response body", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch("/admin/users/user_1")).resolves.toBeUndefined();
  });

  it("throws a clear error when a successful response is not valid JSON", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response("<html>oops</html>", { status: 200 }),
    );

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "API error: 200 response from /admin/users was not valid JSON",
    );
  });

  it("explains missing bearer token responses from raw API routes", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "missing bearer token" }), {
        status: 401,
      }),
    );

    await expect(apiFetch("/internal/auth-events/summary")).rejects.toThrow(
      "Check that API_URL points at the server-adapter origin and that the adapter forwards /internal/auth-events/summary.",
    );
  });
});
