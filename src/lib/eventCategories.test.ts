/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import {
  categorizeEventSummary,
  eventCategories,
  getEventCategory,
} from "./eventCategories";

describe("eventCategories", () => {
  it("classifies concrete API event types into operator categories", () => {
    expect(getEventCategory("oauth_login_success").value).toBe("oauth");
    expect(getEventCategory("webauthn_login_success").value).toBe("webauthn");
    expect(getEventCategory("refresh_token_failed").value).toBe("token");
    expect(getEventCategory("service_token_success").value).toBe(
      "serviceToken",
    );
    expect(getEventCategory("step_up_challenge").value).toBe("stepUp");
    expect(getEventCategory("login_suspicious").value).toBe("security");
  });

  it("does not expose retired or misspelled event categories", () => {
    expect(eventCategories.map((category) => category.value)).not.toContain(
      "bootstrap",
    );
    expect(getEventCategory("bootstrap_admin_granted").value).toBe("other");
    expect(getEventCategory("notication_sent").value).toBe("other");
    expect(getEventCategory("notification_sent").value).toBe("notification");
  });

  it("groups raw event summaries and only keeps populated categories", () => {
    expect(
      categorizeEventSummary([
        { type: "login_success", count: 8 },
        { type: "refresh_token_failed", count: 5 },
        { type: "service_token_success", count: 3 },
        { type: "oauth_login_failed", count: 4 },
        { type: "unknown_backend_event", count: 2 },
      ]),
    ).toEqual([
      { type: "login", label: "Login", count: 8 },
      { type: "token", label: "Session Tokens", count: 5 },
      { type: "oauth", label: "OAuth", count: 4 },
      { type: "serviceToken", label: "Service Tokens", count: 3 },
      { type: "other", label: "Other", count: 2 },
    ]);
  });
});
