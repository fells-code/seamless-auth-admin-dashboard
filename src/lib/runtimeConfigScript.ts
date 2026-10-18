/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { HtmlTagDescriptor, Plugin } from "vite";

/**
 * The `<script src="/config.js">` tag the standalone container's entrypoint fills in,
 * or nothing for the same-origin console build. That build is served under `/console`
 * by the auth API and the adapters, nothing serves `/config.js` there, and a host app
 * that did serve one would have it run inside the console.
 */
export function runtimeConfigScriptTags(
  sameOrigin: boolean,
): HtmlTagDescriptor[] {
  if (sameOrigin) {
    return [];
  }

  // First in the head, so it has run before the module entry reads
  // window.__SEAMLESS_CONFIG__.
  return [
    { tag: "script", attrs: { src: "/config.js" }, injectTo: "head-prepend" },
  ];
}

export function runtimeConfigScript(sameOrigin: boolean): Plugin {
  return {
    name: "seamless-runtime-config-script",
    transformIndexHtml: () => runtimeConfigScriptTags(sameOrigin),
  };
}
