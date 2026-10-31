/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { type HostedUi, HostedUiSchema } from "@seamless-auth/types";

export const HOSTED_UI_COLOR_KEYS = [
  "primary",
  "onPrimary",
  "background",
  "surface",
  "text",
  "muted",
] as const;

export type HostedUiColorKey = (typeof HOSTED_UI_COLOR_KEYS)[number];

export type HostedUiColors = Record<HostedUiColorKey, string>;

/** What the hosted pages render when a value is not set. */
export const HOSTED_UI_DEFAULT_COLORS: HostedUiColors = {
  primary: "#1f4fd1",
  onPrimary: "#ffffff",
  background: "#f5f6f8",
  surface: "#ffffff",
  text: "#1a1d21",
  muted: "#4a515b",
};

export const HOSTED_UI_DEFAULT_FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const HOSTED_UI_COLOR_LABELS: Record<HostedUiColorKey, string> = {
  primary: "Primary",
  onPrimary: "On Primary",
  background: "Background",
  surface: "Surface",
  text: "Text",
  muted: "Muted Text",
};

export const HOSTED_UI_COLOR_HINTS: Record<HostedUiColorKey, string> = {
  primary: "Buttons, links and focus rings.",
  onPrimary: "Text and icons on a primary button.",
  background: "The page behind the card.",
  surface: "The card that holds the form.",
  text: "Headings and body text.",
  muted: "Secondary text such as hints and footers.",
};

/** The editable shape: an empty string means the value is not set. */
export type HostedUiForm = {
  appName: string;
  logoUrl: string;
  fontFamily: string;
  colors: HostedUiColors;
};

export type HostedUiField = "appName" | "logoUrl" | "fontFamily";

export type HostedUiFieldErrors = Partial<
  Record<HostedUiField | HostedUiColorKey, string>
>;

const EMPTY_COLORS: HostedUiColors = {
  primary: "",
  onPrimary: "",
  background: "",
  surface: "",
  text: "",
  muted: "",
};

export function formFromHostedUi(
  value: HostedUi | null | undefined,
): HostedUiForm {
  return {
    appName: value?.appName ?? "",
    logoUrl: value?.logoUrl ?? "",
    fontFamily: value?.fontFamily ?? "",
    colors: { ...EMPTY_COLORS, ...value?.colors },
  };
}

export function isHostedUiFormDirty(
  draft: HostedUiForm | null,
  stored: HostedUi | null | undefined,
) {
  if (!draft) return false;
  return JSON.stringify(draft) !== JSON.stringify(formFromHostedUi(stored));
}

function candidateFromForm(form: HostedUiForm) {
  const candidate: Record<string, unknown> = {};

  if (form.appName.trim()) candidate.appName = form.appName;
  if (form.logoUrl.trim()) candidate.logoUrl = form.logoUrl.trim();
  if (form.fontFamily.trim()) candidate.fontFamily = form.fontFamily.trim();

  const colors: Partial<HostedUiColors> = {};
  for (const key of HOSTED_UI_COLOR_KEYS) {
    const value = form.colors[key].trim();
    if (value) colors[key] = value;
  }
  if (Object.keys(colors).length > 0) candidate.colors = colors;

  return candidate;
}

function messageFor(
  field: HostedUiField | HostedUiColorKey,
  schemaMessage: string,
) {
  switch (field) {
    case "appName":
      return "Use 1 to 100 characters with no control characters.";
    case "logoUrl":
      return schemaMessage.startsWith("must")
        ? `The URL ${schemaMessage}.`
        : "Enter an https URL of 2048 characters or fewer.";
    case "fontFamily":
      return "Use a comma separated list of font names, up to 200 characters. Quote a name with single quotes, such as 'Segoe UI'.";
    default:
      return "Use a hex color such as #1f4fd1, #fff or #1f4fd1cc.";
  }
}

export type HostedUiValidation =
  | { ok: true; value: HostedUi | null }
  | { ok: false; errors: HostedUiFieldErrors };

/**
 * Checks the form against the schema the API enforces. A form with nothing set
 * is the same as the defaults, so it is sent as `null` rather than `{}`.
 */
export function validateHostedUiForm(form: HostedUiForm): HostedUiValidation {
  const candidate = candidateFromForm(form);
  const result = HostedUiSchema.safeParse(candidate);

  if (result.success) {
    return {
      ok: true,
      value: Object.keys(result.data).length > 0 ? result.data : null,
    };
  }

  const errors: HostedUiFieldErrors = {};
  for (const issue of result.error.issues) {
    const [first, second] = issue.path;
    const field = (first === "colors" ? second : first) as
      HostedUiField | HostedUiColorKey | undefined;
    if (!field || errors[field]) continue;
    errors[field] = messageFor(field, issue.message);
  }

  return { ok: false, errors };
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export type Rgba = { r: number; g: number; b: number; a: number };

export function parseHexColor(value: string): Rgba | null {
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return null;

  let hex = trimmed.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((digit) => digit + digit)
      .join("");
  }

  const channel = (offset: number) =>
    parseInt(hex.slice(offset, offset + 2), 16);

  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: hex.length === 8 ? channel(6) / 255 : 1,
  };
}

/** Blends a translucent color over the opaque color beneath it. */
export function composite(foreground: Rgba, backdrop: Rgba): Rgba {
  const mix = (top: number, bottom: number) =>
    top * foreground.a + bottom * (1 - foreground.a);

  return {
    r: mix(foreground.r, backdrop.r),
    g: mix(foreground.g, backdrop.g),
    b: mix(foreground.b, backdrop.b),
    a: 1,
  };
}

/** WCAG 2.x relative luminance of an opaque sRGB color. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * Contrast ratio between a foreground and the opaque color it sits on. A
 * translucent foreground is blended over that backdrop first, which is what the
 * reader actually sees.
 */
export function contrastRatio(foreground: Rgba, backdrop: Rgba): number {
  const top = composite(foreground, backdrop);
  const [l1, l2] = [relativeLuminance(top), relativeLuminance(backdrop)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

/** The color each key resolves to, falling back to the page default. */
export function resolveHostedUiColors(
  colors: Partial<HostedUiColors>,
): HostedUiColors {
  const resolved = { ...HOSTED_UI_DEFAULT_COLORS };
  for (const key of HOSTED_UI_COLOR_KEYS) {
    const value = colors[key]?.trim();
    if (value && parseHexColor(value)) resolved[key] = value;
  }
  return resolved;
}

export type ContrastCheck = {
  id: string;
  foreground: HostedUiColorKey;
  backdrop: HostedUiColorKey;
  label: string;
  ratio: number;
  minimum: number;
  passes: boolean;
};

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

const CHECKS: {
  foreground: HostedUiColorKey;
  backdrop: HostedUiColorKey;
  label: string;
  minimum: number;
}[] = [
  {
    foreground: "text",
    backdrop: "background",
    label: "Text on background",
    minimum: AA_TEXT,
  },
  {
    foreground: "text",
    backdrop: "surface",
    label: "Text on surface",
    minimum: AA_TEXT,
  },
  {
    foreground: "muted",
    backdrop: "surface",
    label: "Muted text on surface",
    minimum: AA_TEXT,
  },
  {
    foreground: "muted",
    backdrop: "background",
    label: "Muted text on background",
    minimum: AA_TEXT,
  },
  {
    foreground: "onPrimary",
    backdrop: "primary",
    label: "On primary text on primary",
    minimum: AA_TEXT,
  },
  {
    foreground: "primary",
    backdrop: "surface",
    label: "Primary controls on surface",
    minimum: AA_NON_TEXT,
  },
];

/**
 * WCAG 2.2 AA checks for the pairs the hosted pages actually draw. Layers are
 * flattened from the bottom up: the background over white (the browser canvas),
 * the surface over the background, and the primary button over the surface.
 */
export function checkHostedUiContrast(
  colors: Partial<HostedUiColors>,
): ContrastCheck[] {
  const resolved = resolveHostedUiColors(colors);
  const raw = (key: HostedUiColorKey) => parseHexColor(resolved[key]) as Rgba;

  const background = composite(raw("background"), WHITE);
  const surface = composite(raw("surface"), background);
  const primary = composite(raw("primary"), surface);
  const opaque: Partial<Record<HostedUiColorKey, Rgba>> = {
    background,
    surface,
    primary,
  };

  return CHECKS.map((check) => {
    const ratio = contrastRatio(
      raw(check.foreground),
      opaque[check.backdrop] as Rgba,
    );

    return {
      ...check,
      id: `${check.foreground}-on-${check.backdrop}`,
      ratio,
      passes: ratio >= check.minimum,
    };
  });
}

export function formatRatio(ratio: number) {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

/** `<input type="color">` only takes #rrggbb, so alpha is dropped for it. */
export function toColorInputValue(value: string, fallback: string) {
  const parsed = parseHexColor(value) ?? parseHexColor(fallback);
  if (!parsed) return "#000000";

  const hex = (channel: number) =>
    Math.round(channel).toString(16).padStart(2, "0");

  return `#${hex(parsed.r)}${hex(parsed.g)}${hex(parsed.b)}`;
}

/** Applies a color picker choice while keeping any alpha the value already had. */
export function applyPickedColor(picked: string, current: string) {
  const trimmed = current.trim();
  const alpha = /^#[0-9a-fA-F]{8}$/.test(trimmed) ? trimmed.slice(7) : "";
  return `${picked.toLowerCase()}${alpha}`;
}
