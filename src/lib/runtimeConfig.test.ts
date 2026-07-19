/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiUrl, getBasePath } from "./runtimeConfig";

afterEach(() => {
  delete window.__SEAMLESS_CONFIG__;
  vi.unstubAllEnvs();
});

describe("getApiUrl", () => {
  it("prefers runtime injected config", () => {
    window.__SEAMLESS_CONFIG__ = { API_URL: "https://portal-api.example.com" };
    vi.stubEnv("VITE_SAME_ORIGIN", "true");
    vi.stubEnv("VITE_API_URL", "https://baked.example.com");

    expect(getApiUrl()).toBe("https://portal-api.example.com");
  });

  it("derives the API base from the page origin in same-origin mode", () => {
    vi.stubEnv("VITE_SAME_ORIGIN", "true");
    vi.stubEnv("VITE_API_URL", "https://baked.example.com");

    expect(getApiUrl()).toBe(window.location.origin);
  });

  it("falls back to the baked VITE_API_URL for the standalone build", () => {
    vi.stubEnv("VITE_SAME_ORIGIN", "");
    vi.stubEnv("VITE_API_URL", "https://baked.example.com");

    expect(getApiUrl()).toBe("https://baked.example.com");
  });
});

describe("getBasePath", () => {
  it("defaults to root", () => {
    vi.stubEnv("VITE_BASE_PATH", "/");
    expect(getBasePath()).toBe("/");
  });

  it("strips the trailing slash for the /admin build", () => {
    vi.stubEnv("VITE_BASE_PATH", "/admin/");
    expect(getBasePath()).toBe("/admin");
  });

  it("treats a missing base path as root", () => {
    vi.stubEnv("VITE_BASE_PATH", "");
    expect(getBasePath()).toBe("/");
  });
});
