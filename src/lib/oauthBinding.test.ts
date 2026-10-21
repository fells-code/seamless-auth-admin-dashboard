/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearOAuthBinding,
  readOAuthBinding,
  storeOAuthBinding,
} from "./oauthBinding";

describe("oauthBinding", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns the binding only for the state it was stored with", () => {
    storeOAuthBinding("s1", "b1");

    expect(readOAuthBinding("s1")).toBe("b1");
    expect(readOAuthBinding("s2")).toBeUndefined();
  });

  it("drops a stale binding when a start returns none", () => {
    storeOAuthBinding("s1", "b1");
    storeOAuthBinding("s2", undefined);

    expect(readOAuthBinding("s1")).toBeUndefined();
  });

  it("clears the binding", () => {
    storeOAuthBinding("s1", "b1");
    clearOAuthBinding();

    expect(readOAuthBinding("s1")).toBeUndefined();
  });

  it("ignores an unreadable stored value", () => {
    sessionStorage.setItem("seamless:oauth:binding", "{not json");

    expect(readOAuthBinding("s1")).toBeUndefined();
  });
});
