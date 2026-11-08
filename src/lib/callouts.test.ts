/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import {
  describeCalloutFailure,
  describeIssues,
  describeTestResult,
  describeWriteRefusal,
  formatTimestamp,
  retryUnlessMissing,
} from "./callouts";

describe("describeCalloutFailure", () => {
  it("names the status code an endpoint answered with", () => {
    expect(describeCalloutFailure("http_status", 503)).toBe(
      "The destination answered HTTP 503.",
    );
  });

  it("explains each coarse reason", () => {
    expect(describeCalloutFailure("refused")).toMatch(/CALLOUT_PRIVATE_HOSTS/);
    expect(describeCalloutFailure("timed_out")).toMatch(/in time/);
    expect(describeCalloutFailure("too_large")).toMatch(/size limit/);
    expect(describeCalloutFailure("http_status", null)).toMatch(/error status/);
  });

  it("says nothing when nothing failed", () => {
    expect(describeCalloutFailure(null)).toBeNull();
  });
});

describe("describeTestResult", () => {
  it("reports a success with its status and timing", () => {
    expect(
      describeTestResult({
        ok: true,
        failure: null,
        statusCode: 204,
        durationMs: 40,
      }),
    ).toBe("Answered HTTP 204 in 40 ms.");
  });

  it("reports a failure with its reason", () => {
    expect(
      describeTestResult({
        ok: false,
        failure: "connection_failed",
        statusCode: null,
        durationMs: 12,
      }),
    ).toBe("The API could not connect to the destination. Took 12 ms.");
  });
});

describe("describeWriteRefusal", () => {
  it("names the fields a schema refusal lists", () => {
    const error = new ApiError(
      "Request failed schema validation.",
      400,
      "invalid_request",
      {
        issues: [
          { path: ["claims", "email"], message: "is a reserved claim name" },
          { path: [], message: "nothing to update" },
        ],
      },
    );

    expect(describeWriteRefusal(error)).toBe(
      "Request failed schema validation. claims.email: is a reserved claim name; nothing to update",
    );
  });

  it("keeps the message of any other refusal", () => {
    expect(describeWriteRefusal(new ApiError("Source not found", 404))).toBe(
      "Source not found",
    );
    expect(describeWriteRefusal(new Error("boom"))).toBe("boom");
  });
});

describe("helpers", () => {
  it("joins local issues", () => {
    expect(describeIssues([{ path: ["url"], message: "must use https" }])).toBe(
      "url: must use https",
    );
  });

  it("formats an absent timestamp as null", () => {
    expect(formatTimestamp(null)).toBeNull();
    expect(formatTimestamp("2026-06-15T12:00:00.000Z")).toBeTruthy();
  });

  it("does not retry a missing route", () => {
    expect(retryUnlessMissing(0, new ApiError("Not found", 404))).toBe(false);
    expect(retryUnlessMissing(0, new ApiError("Down", 503))).toBe(true);
  });
});
