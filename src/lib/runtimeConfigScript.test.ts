/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";

import { runtimeConfigScriptTags } from "./runtimeConfigScript";

describe("runtimeConfigScriptTags", () => {
  it("loads config.js for the standalone build", () => {
    expect(runtimeConfigScriptTags(false)).toEqual([
      { tag: "script", attrs: { src: "/config.js" }, injectTo: "head-prepend" },
    ]);
  });

  it("loads nothing for the same-origin console build", () => {
    expect(runtimeConfigScriptTags(true)).toEqual([]);
  });
});
