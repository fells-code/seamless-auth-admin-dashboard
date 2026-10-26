/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import { POLICY_KEYS } from "@seamless-auth/types";
import {
  diffPolicy,
  formatPolicyValue,
  POLICY_KEY_LABELS,
  touchesPolicy,
} from "./policyDiff";
import { makePolicy } from "../test/policyFixtures";

describe("diffPolicy", () => {
  it("reports nothing for identical policies", () => {
    expect(diffPolicy(makePolicy(), makePolicy())).toEqual([]);
  });

  it("reports a changed top-level setting with readable values", () => {
    expect(
      diffPolicy(
        makePolicy(),
        makePolicy({
          login_methods: ["passkey"],
          phishing_resistant_only: true,
        }),
      ),
    ).toEqual([
      {
        key: "login_methods",
        label: "Login methods",
        before: "passkey, magic_link",
        after: "passkey",
      },
      {
        key: "phishing_resistant_only",
        label: "Phishing-resistant only",
        before: "Off",
        after: "On",
      },
    ]);
  });

  it("compares object-valued settings field by field", () => {
    const before = makePolicy();
    const after = makePolicy({
      lockout_policy: { ...before.lockout_policy, maxFailures: 5 },
      authenticator_policy: {
        ...before.authenticator_policy,
        aaguidAllowList: ["adce0002-35bc-c60a-648b-0b25f1f05503"],
      },
    });

    expect(diffPolicy(before, after)).toEqual([
      {
        key: "authenticator_policy",
        field: "aaguidAllowList",
        label: "Authenticator policy",
        before: "None",
        after: "adce0002-35bc-c60a-648b-0b25f1f05503",
      },
      {
        key: "lockout_policy",
        field: "maxFailures",
        label: "Lockout policy",
        before: "10",
        after: "5",
      },
    ]);
  });

  it("reports a setting one side does not have", () => {
    const { recovery_codes, ...rest } = makePolicy();
    void recovery_codes;

    expect(diffPolicy(rest, makePolicy())).toEqual([
      expect.objectContaining({
        key: "recovery_codes",
        before: "Not set",
      }),
    ]);
  });
});

describe("formatPolicyValue", () => {
  it("formats each kind of value", () => {
    expect(formatPolicyValue(true)).toBe("On");
    expect(formatPolicyValue(false)).toBe("Off");
    expect(formatPolicyValue([])).toBe("None");
    expect(formatPolicyValue(undefined)).toBe("Not set");
    expect(formatPolicyValue("24h")).toBe("24h");
    expect(formatPolicyValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe("touchesPolicy", () => {
  it("is true only for a patch that includes a policy key", () => {
    expect(touchesPolicy({ login_methods: ["passkey"] })).toBe(true);
    expect(touchesPolicy({ app_name: "Seamless" })).toBe(false);
    expect(touchesPolicy({})).toBe(false);
  });
});

it("labels every policy key", () => {
  for (const key of POLICY_KEYS) {
    expect(POLICY_KEY_LABELS[key]).toBeTruthy();
  }
});
