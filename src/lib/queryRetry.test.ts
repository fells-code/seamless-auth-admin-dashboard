/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { shouldRetryQuery } from "./queryRetry";

describe("shouldRetryQuery", () => {
  it("retries transient failures up to three times", () => {
    const error = new ApiError("The Seamless Auth API had a problem.", 503);

    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(true);
    expect(shouldRetryQuery(3, error)).toBe(false);
    expect(shouldRetryQuery(0, new TypeError("Failed to fetch"))).toBe(true);
  });

  it("does not retry an expired session", () => {
    expect(shouldRetryQuery(0, new ApiError("expired", 401))).toBe(false);
  });

  it("does not retry a request the API rejected as invalid", () => {
    expect(shouldRetryQuery(0, new ApiError("invalid", 400))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError("invalid", 422))).toBe(false);
  });
});
