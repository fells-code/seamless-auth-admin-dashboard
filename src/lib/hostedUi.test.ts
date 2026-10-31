/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { describe, expect, it } from "vitest";
import {
  applyPickedColor,
  checkHostedUiContrast,
  composite,
  contrastRatio,
  formatRatio,
  formFromHostedUi,
  HOSTED_UI_DEFAULT_COLORS,
  isHostedUiFormDirty,
  parseHexColor,
  relativeLuminance,
  resolveHostedUiColors,
  toColorInputValue,
  validateHostedUiForm,
} from "./hostedUi";

const rgb = (hex: string) => {
  const parsed = parseHexColor(hex);
  if (!parsed) throw new Error(`bad test color ${hex}`);
  return parsed;
};

describe("parseHexColor", () => {
  it("reads 3, 6 and 8 digit hex", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHexColor("#1f4fd1")).toEqual({ r: 31, g: 79, b: 209, a: 1 });
    expect(parseHexColor("#00000080")).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 128 / 255,
    });
  });

  it("rejects anything else", () => {
    for (const value of ["", "fff", "#ff", "#ffff", "#gggggg", "red"]) {
      expect(parseHexColor(value)).toBeNull();
    }
  });
});

describe("contrast", () => {
  it("follows the WCAG relative luminance formula", () => {
    expect(relativeLuminance(rgb("#000"))).toBe(0);
    expect(relativeLuminance(rgb("#fff"))).toBeCloseTo(1, 10);
    expect(relativeLuminance(rgb("#808080"))).toBeCloseTo(0.2158605, 6);
  });

  it("gives 21:1 for black on white and 1:1 for a color on itself", () => {
    expect(contrastRatio(rgb("#000"), rgb("#fff"))).toBeCloseTo(21, 10);
    expect(contrastRatio(rgb("#1f4fd1"), rgb("#1f4fd1"))).toBeCloseTo(1, 10);
  });

  it("matches published ratios for grays on white", () => {
    expect(contrastRatio(rgb("#767676"), rgb("#fff"))).toBeCloseTo(4.54, 2);
    expect(contrastRatio(rgb("#777777"), rgb("#fff"))).toBeCloseTo(4.48, 2);
  });

  it("blends a translucent foreground over its backdrop", () => {
    const half = composite(rgb("#00000080"), rgb("#ffffff"));
    expect(half.r).toBeCloseTo(127, 0);
    expect(half.a).toBe(1);
    expect(contrastRatio(rgb("#00000000"), rgb("#fff"))).toBeCloseTo(1, 10);
  });

  it("formats a ratio without rounding a failure up to a pass", () => {
    expect(formatRatio(4.4999)).toBe("4.49:1");
    expect(formatRatio(21)).toBe("21.00:1");
  });
});

describe("checkHostedUiContrast", () => {
  it("passes every check with the hosted page defaults", () => {
    const checks = checkHostedUiContrast({});

    expect(checks.map((check) => check.id)).toEqual([
      "text-on-background",
      "text-on-surface",
      "muted-on-surface",
      "muted-on-background",
      "onPrimary-on-primary",
      "primary-on-surface",
    ]);
    expect(checks.every((check) => check.passes)).toBe(true);
  });

  it("holds text to 4.5:1 and the primary color to 3:1", () => {
    const checks = checkHostedUiContrast({});
    const minimum = Object.fromEntries(
      checks.map((check) => [check.id, check.minimum]),
    );

    expect(minimum["text-on-background"]).toBe(4.5);
    expect(minimum["onPrimary-on-primary"]).toBe(4.5);
    expect(minimum["primary-on-surface"]).toBe(3);
  });

  it("flags a low contrast pair and leaves the rest alone", () => {
    const checks = checkHostedUiContrast({ primary: "#ffd400" });
    const failing = checks.filter((check) => !check.passes).map((c) => c.id);

    expect(failing).toEqual(["onPrimary-on-primary", "primary-on-surface"]);
  });

  it("uses 3:1 rather than 4.5:1 for the primary color on the surface", () => {
    // About 3.3:1 on white: fine for a control, too low for text.
    const [check] = checkHostedUiContrast({ primary: "#e0533d" }).filter(
      (c) => c.id === "primary-on-surface",
    );

    expect(check.ratio).toBeGreaterThan(3);
    expect(check.ratio).toBeLessThan(4.5);
    expect(check.passes).toBe(true);
  });

  it("composites a translucent surface over the background", () => {
    const opaque = checkHostedUiContrast({
      background: "#000000",
      surface: "#ffffff",
    });
    const translucent = checkHostedUiContrast({
      background: "#000000",
      surface: "#ffffff00",
    });

    const textOnSurface = (checks: typeof opaque) =>
      checks.find((check) => check.id === "text-on-surface")!;

    expect(textOnSurface(opaque).passes).toBe(true);
    // A fully transparent white surface is the black background.
    expect(textOnSurface(translucent).passes).toBe(false);
  });

  it("checks an unset or malformed color at its default", () => {
    expect(resolveHostedUiColors({ text: "#12", muted: " " })).toEqual(
      HOSTED_UI_DEFAULT_COLORS,
    );
  });
});

describe("validateHostedUiForm", () => {
  it("sends null when nothing is set", () => {
    expect(validateHostedUiForm(formFromHostedUi(null))).toEqual({
      ok: true,
      value: null,
    });
  });

  it("returns the whole object with blanks left out and values trimmed", () => {
    const form = formFromHostedUi(null);
    form.appName = "  Acme  ";
    form.logoUrl = " https://cdn.acme.test/logo.svg ";
    form.fontFamily = "Inter, 'Segoe UI', sans-serif";
    form.colors.primary = "#0a0";

    expect(validateHostedUiForm(form)).toEqual({
      ok: true,
      value: {
        appName: "Acme",
        logoUrl: "https://cdn.acme.test/logo.svg",
        fontFamily: "Inter, 'Segoe UI', sans-serif",
        colors: { primary: "#0a0" },
      },
    });
  });

  it("maps schema issues onto the fields that caused them", () => {
    const form = formFromHostedUi(null);
    form.appName = "a".repeat(101);
    form.logoUrl = "http://cdn.acme.test/logo.svg";
    form.fontFamily = 'Inter, "Segoe UI"';
    form.colors.muted = "grey";

    const result = validateHostedUiForm(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "appName",
      "fontFamily",
      "logoUrl",
      "muted",
    ]);
    expect(result.errors.muted).toMatch(/hex color/);
  });

  it("explains a logo URL the schema refuses for its characters", () => {
    const form = formFromHostedUi(null);
    form.logoUrl = "https://cdn.acme.test/logo(1).svg";

    const result = validateHostedUiForm(form);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.logoUrl).toMatch(/^The URL must not contain/);
  });

  it("refuses a logo URL that carries credentials", () => {
    const form = formFromHostedUi(null);
    form.logoUrl = "https://user:pass@cdn.acme.test/logo.svg";

    expect(validateHostedUiForm(form).ok).toBe(false);
  });
});

describe("form helpers", () => {
  it("fills every field from a stored value", () => {
    expect(formFromHostedUi({ colors: { text: "#111" } })).toEqual({
      appName: "",
      logoUrl: "",
      fontFamily: "",
      colors: {
        primary: "",
        onPrimary: "",
        background: "",
        surface: "",
        text: "#111",
        muted: "",
      },
    });
  });

  it("is dirty only when the draft differs from what is stored", () => {
    const stored = { appName: "Acme" };

    expect(isHostedUiFormDirty(null, stored)).toBe(false);
    expect(isHostedUiFormDirty(formFromHostedUi(stored), stored)).toBe(false);
    expect(
      isHostedUiFormDirty(
        { ...formFromHostedUi(stored), appName: "B" },
        stored,
      ),
    ).toBe(true);
  });

  it("gives the color picker a six digit value", () => {
    expect(toColorInputValue("#abc", "#000000")).toBe("#aabbcc");
    expect(toColorInputValue("#11223380", "#000000")).toBe("#112233");
    expect(toColorInputValue("", "#1f4fd1")).toBe("#1f4fd1");
    expect(toColorInputValue("nope", "also nope")).toBe("#000000");
  });

  it("keeps the alpha a value had when a new color is picked", () => {
    expect(applyPickedColor("#AABBCC", "#11223380")).toBe("#aabbcc80");
    expect(applyPickedColor("#aabbcc", "#123")).toBe("#aabbcc");
  });
});
