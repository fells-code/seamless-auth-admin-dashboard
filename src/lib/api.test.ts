/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiDownload, apiFetch } from "./api";
import { onSessionExpired, resetSessionExpiryNotice } from "./sessionExpiry";

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

  it("hides raw server error bodies behind a friendly message and logs the detail", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchMock = vi.mocked(fetch);
    const rawBody =
      "Error: connect ECONNREFUSED 10.0.3.14:5432 at Connection._connect";
    fetchMock.mockResolvedValue(new Response(rawBody, { status: 500 }));

    const error = await apiFetch("/admin/users").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toBe(
      "The Seamless Auth API had a problem. Try again shortly.",
    );
    expect(message).not.toContain(rawBody);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(rawBody));

    consoleError.mockRestore();
  });

  it("surfaces an actionable validation message from a 409", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "User already exists" }), {
        status: 409,
      }),
    );

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "User already exists",
    );
  });

  it("surfaces a validation message sent under the message field", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Organization must keep at least one owner",
        }),
        { status: 400 },
      ),
    );

    await expect(apiFetch("/admin/organizations")).rejects.toThrow(
      "Organization must keep at least one owner",
    );
  });

  it("prefers the detail message over the reason when both are present", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Invalid roles",
          message: "Roles not available on this instance: admin:reed",
          details: { roles: ["admin:reed"] },
        }),
        { status: 400 },
      ),
    );

    // "Invalid roles" does not tell an operator which role to fix.
    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "Roles not available on this instance: admin:reed",
    );
  });

  it("falls back to the reason when the detail is not renderable", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "User already exists", message: "conflict" }),
        { status: 409 },
      ),
    );

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "User already exists",
    );
  });

  it("does not surface machine codes as user-facing text", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "step_up_failed" }), {
        status: 400,
      }),
    );

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "The request was invalid. Check the values and try again.",
    );
  });

  it("does not surface upstream text for server errors", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
      }),
    );

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "The Seamless Auth API had a problem. Try again shortly.",
    );

    consoleError.mockRestore();
  });

  it("does not surface unstructured error bodies", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response("<html>Gateway problem</html>", { status: 400 }),
    );

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "The request was invalid. Check the values and try again.",
    );
  });

  it("maps a 403 to a permission message", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response("forbidden", { status: 403 }));

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "You do not have permission to perform this action.",
    );
  });

  it("does not log upstream error detail outside development", async () => {
    vi.stubEnv("DEV", false);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response("ada@example.com not found in tenant 42", { status: 500 }),
    );

    await expect(apiFetch("/admin/users")).rejects.toThrow(
      "The Seamless Auth API had a problem. Try again shortly.",
    );

    // Production consoles are captured by session replay tools and extensions,
    // so the raw body must not reach them.
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
    vi.unstubAllEnvs();
  });

  it("reports an expired session centrally and carries the status", async () => {
    const listener = vi.fn();
    resetSessionExpiryNotice();
    const unsubscribe = onSessionExpired(listener);

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    );

    // The status travels on the error so callers, and the query retry policy,
    // can branch on it rather than matching the message text.
    await expect(apiFetch("/admin/users")).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    resetSessionExpiryNotice();
  });

  it("does not report an expired session for other failures", async () => {
    const listener = vi.fn();
    resetSessionExpiryNotice();
    const unsubscribe = onSessionExpired(listener);

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "nope" }), { status: 403 }),
    );

    await expect(apiFetch("/admin/users")).rejects.toMatchObject({
      status: 403,
    });
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });
});

describe("apiDownload", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    resetSessionExpiryNotice();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the body as a file named by the API", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("a,b\r\n1,2\r\n", {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition":
            'attachment; filename="authentication-coverage-2026-01-01-to-2026-03-31.csv"',
        },
      }),
    );

    const { blob, filename } = await apiDownload(
      "/admin/reports/authentication-coverage?format=csv",
      "fallback.csv",
    );

    expect(filename).toBe(
      "authentication-coverage-2026-01-01-to-2026-03-31.csv",
    );
    expect(await blob.text()).toBe("a,b\r\n1,2\r\n");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://api.example.com/auth/admin/reports/authentication-coverage?format=csv",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("falls back to the given name without a disposition header", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(
      apiDownload("/admin/auth-events/export", "auth-events.ndjson"),
    ).resolves.toEqual(
      expect.objectContaining({ filename: "auth-events.ndjson" }),
    );
  });

  it("keeps only the last path segment of a filename", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("x", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="../../evil.sh"',
        },
      }),
    );

    const { filename } = await apiDownload("/admin/auth-events/export", "f");

    expect(filename).toBe("evil.sh");
  });

  it("raises the same errors apiFetch does", async () => {
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);
    vi.mocked(fetch).mockResolvedValue(
      new Response('{"error":"step_up_required"}', { status: 403 }),
    );

    await expect(
      apiDownload("/admin/auth-events/export", "f"),
    ).rejects.toMatchObject({ name: "ApiError", status: 403 });

    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 401 }));
    await expect(
      apiDownload("/admin/auth-events/export", "f"),
    ).rejects.toMatchObject({
      status: 401,
    });
    expect(expired).toHaveBeenCalled();
    unsubscribe?.();
  });
});
