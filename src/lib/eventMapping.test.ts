/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { collapseTypes } from "./eventMapping";

describe("collapseTypes", () => {
  it("collapses login events to the login alias", () => {
    expect(collapseTypes(["login_success", "login_failed"])).toBe("login");
  });

  it("collapses otp and webauthn event families", () => {
    expect(collapseTypes(["otp_failed"])).toBe("otp");
    expect(collapseTypes(["webauthn_login_success"])).toBe("webauthn");
  });

  it("collapses magic link and suspicious groups", () => {
    expect(collapseTypes(["magic_link_requested"])).toBe("magicLink");
    expect(collapseTypes(["request_suspicious"])).toBe("suspicious");
  });

  it("falls back to the first concrete type", () => {
    expect(collapseTypes(["token_refreshed", "token_issued"])).toBe(
      "token_refreshed",
    );
  });

  it("returns an empty string for missing values", () => {
    expect(collapseTypes([])).toBe("");
  });
});
