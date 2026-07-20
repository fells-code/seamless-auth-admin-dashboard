/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import css from "../index.css?raw";

/**
 * Guards the foreground tokens against the surfaces they sit on. Adding a theme
 * with a light --primary and leaving --on-primary white would otherwise ship
 * unreadable buttons, which is how this started.
 */

const AA_NORMAL_TEXT = 4.5;

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4]
    .map((offset) => parseInt(value.substr(offset, 2), 16) / 255)
    .map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

type Tokens = {
  primary?: string;
  onPrimary?: string;
  highlight?: string;
  onHighlight?: string;
};

/** Read each theme block, carrying :root values forward as the cascade does. */
function readThemeBlocks(css: string): { selector: string; tokens: Tokens }[] {
  const blocks = css.split(/\n(?=[:.][a-zA-Z[])/);
  const results: { selector: string; tokens: Tokens }[] = [];
  let base: Tokens = {};

  for (const block of blocks) {
    const selector = (block.match(/^[^{]+\{/)?.[0] ?? "").trim();
    if (!selector.startsWith(":root") && !selector.startsWith(".dark"))
      continue;

    const read = (name: string) =>
      block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

    const tokens: Tokens = {
      primary: read("primary") ?? base.primary,
      onPrimary: read("on-primary") ?? base.onPrimary,
      highlight: read("highlight") ?? base.highlight,
      onHighlight: read("on-highlight") ?? base.onHighlight,
    };

    if (selector.startsWith(":root {")) base = tokens;
    results.push({ selector, tokens });
  }

  return results;
}

const themes = readThemeBlocks(css);

describe("theme contrast", () => {
  it("finds every theme block", () => {
    // Guards the parser itself: a silent zero would make the checks below vacuous.
    expect(themes.length).toBeGreaterThanOrEqual(10);
  });

  it.each(themes)("$selector meets AA on primary", ({ tokens }) => {
    expect(tokens.primary).toBeDefined();
    expect(tokens.onPrimary).toBeDefined();
    expect(
      contrastRatio(tokens.primary!, tokens.onPrimary!),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it.each(themes)("$selector meets AA on highlight", ({ tokens }) => {
    expect(tokens.highlight).toBeDefined();
    expect(tokens.onHighlight).toBeDefined();
    expect(
      contrastRatio(tokens.highlight!, tokens.onHighlight!),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
