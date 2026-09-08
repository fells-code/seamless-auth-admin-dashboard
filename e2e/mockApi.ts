/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { Page, Request, Route } from "@playwright/test";

export type MockResponse = {
  status?: number;
  json?: unknown;
  body?: string;
  headers?: Record<string, string>;
};

export type MockContext = {
  request: Request;
  url: URL;
  /** Path params captured from a `:name` segment in the registered path. */
  params: Record<string, string>;
  /** Parsed JSON request body, or undefined when there is none. */
  payload: unknown;
};

export type MockHandler = (
  context: MockContext,
) => MockResponse | unknown | Promise<MockResponse | unknown>;

type Registration = {
  method: string;
  segments: string[];
  handler: MockHandler;
};

type RecordedCall = {
  method: string;
  path: string;
  url: string;
  payload: unknown;
};

function isMockResponse(value: unknown): value is MockResponse {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return (
    "status" in candidate ||
    "json" in candidate ||
    "body" in candidate ||
    "headers" in candidate
  );
}

function splitPath(path: string) {
  return path.replace(/^\/+|\/+$/g, "").split("/");
}

/**
 * A mocked Seamless Auth server adapter.
 *
 * The dashboard talks to the adapter at `/auth/*`, so every path registered here
 * is written the way the dashboard's own hooks write it (`/admin/users`) and the
 * `/auth` prefix is stripped on the way in.
 *
 * Registrations are matched last-first, so a persona can seed a whole working
 * deployment and an individual test can override one endpoint without unpicking
 * the rest.
 *
 * Anything under `/auth/*` with no registration is answered 501 and recorded.
 * The fixture fails the test at teardown, so a route the app started calling is
 * a visible failure rather than a silent empty screen.
 */
export class MockApi {
  private readonly registrations: Registration[] = [];
  private readonly unhandled: RecordedCall[] = [];
  private readonly calls: RecordedCall[] = [];

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async install(apiOrigin: string) {
    // Serves the runtime config the container would write at startup, so the
    // app resolves its API URL through the real getApiUrl path.
    await this.page.route("**/config.js", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `window.__SEAMLESS_CONFIG__ = { API_URL: ${JSON.stringify(apiOrigin)} };`,
      }),
    );

    await this.page.route("**/auth/**", (route) => this.dispatch(route));
  }

  get(path: string, handler: MockHandler | MockResponse) {
    return this.register("GET", path, handler);
  }

  post(path: string, handler: MockHandler | MockResponse) {
    return this.register("POST", path, handler);
  }

  patch(path: string, handler: MockHandler | MockResponse) {
    return this.register("PATCH", path, handler);
  }

  put(path: string, handler: MockHandler | MockResponse) {
    return this.register("PUT", path, handler);
  }

  delete(path: string, handler: MockHandler | MockResponse) {
    return this.register("DELETE", path, handler);
  }

  /** Every `/auth/*` call the page made, in order, for assertions on requests. */
  recordedCalls(method?: string, path?: string) {
    return this.calls.filter(
      (call) =>
        (method === undefined || call.method === method.toUpperCase()) &&
        (path === undefined || call.path === path),
    );
  }

  lastCall(method: string, path: string) {
    return this.recordedCalls(method, path).at(-1);
  }

  unhandledCalls() {
    return [...this.unhandled];
  }

  /** Clears recorded misses. Only a test asserting on one should call this. */
  clearUnhandledCalls() {
    this.unhandled.length = 0;
  }

  private register(
    method: string,
    path: string,
    handler: MockHandler | MockResponse,
  ) {
    this.registrations.push({
      method,
      segments: splitPath(path),
      handler: typeof handler === "function" ? handler : () => handler,
    });

    return this;
  }

  private match(method: string, path: string) {
    const segments = splitPath(path);

    // Last registration wins, so a test's override beats the persona's seed.
    for (let index = this.registrations.length - 1; index >= 0; index -= 1) {
      const registration = this.registrations[index];

      if (registration.method !== method) continue;
      if (registration.segments.length !== segments.length) continue;

      const params: Record<string, string> = {};
      const matched = registration.segments.every((expected, position) => {
        if (expected.startsWith(":")) {
          params[expected.slice(1)] = decodeURIComponent(segments[position]);
          return true;
        }

        return expected === segments[position];
      });

      if (matched) {
        return { registration, params };
      }
    }

    return undefined;
  }

  private async dispatch(route: Route) {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    // The adapter path is fixed and shared by every request, so registrations
    // stay written the way the dashboard's hooks write them.
    const path = url.pathname.replace(/^\/auth/, "") || "/";

    let payload: unknown;
    try {
      payload = request.postData()
        ? JSON.parse(request.postData()!)
        : undefined;
    } catch {
      payload = request.postData();
    }

    const call: RecordedCall = { method, path, url: request.url(), payload };
    this.calls.push(call);

    const found = this.match(method, path);

    if (!found) {
      this.unhandled.push(call);

      return route.fulfill({
        status: 501,
        contentType: "application/json",
        body: JSON.stringify({
          error: `No mock registered for ${method} ${path}`,
        }),
      });
    }

    const result = await found.registration.handler({
      request,
      url,
      params: found.params,
      payload,
    });

    const response: MockResponse = isMockResponse(result)
      ? result
      : { json: result };

    const status = response.status ?? 200;

    if (status === 204 || (response.json === undefined && !response.body)) {
      return route.fulfill({ status, headers: response.headers, body: "" });
    }

    return route.fulfill({
      status,
      headers: response.headers,
      contentType: "application/json",
      body: response.body ?? JSON.stringify(response.json),
    });
  }
}
