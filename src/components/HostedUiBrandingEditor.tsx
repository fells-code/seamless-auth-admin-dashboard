/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useState } from "react";
import type { HostedUi } from "@seamless-auth/types";
import { useUpdateSystemConfig } from "../hooks/useUpdateSystemConfig";
import type { useConfirm } from "../hooks/useConfirm";
import type { useToast } from "../hooks/useToast";
import { controlClassName } from "../lib/configFields";
import { getErrorMessage } from "../lib/errorMessage";
import {
  applyPickedColor,
  checkHostedUiContrast,
  formatRatio,
  formFromHostedUi,
  HOSTED_UI_COLOR_HINTS,
  HOSTED_UI_COLOR_KEYS,
  HOSTED_UI_COLOR_LABELS,
  HOSTED_UI_DEFAULT_COLORS,
  HOSTED_UI_DEFAULT_FONT,
  type HostedUiColorKey,
  type HostedUiField,
  type HostedUiFieldErrors,
  type HostedUiForm,
  isHostedUiFormDirty,
  resolveHostedUiColors,
  toColorInputValue,
  validateHostedUiForm,
} from "../lib/hostedUi";
import { Field, Input } from "./ConfigFields";
import HostedUiPreview from "./HostedUiPreview";
import { StateMessage } from "./StateMessage";

export default function HostedUiBrandingEditor({
  stored,
  defaultAppName,
  draft,
  onDraftChange,
  canWrite,
  ensureStepUp,
  toast,
  confirm,
}: {
  stored: HostedUi | null;
  defaultAppName: string;
  /** The unsaved edit, or `null` while the form shows what is stored. */
  draft: HostedUiForm | null;
  onDraftChange: (draft: HostedUiForm | null) => void;
  canWrite: boolean;
  ensureStepUp: () => Promise<boolean>;
  toast: ReturnType<typeof useToast>;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const update = useUpdateSystemConfig();
  const [errors, setErrors] = useState<HostedUiFieldErrors>({});
  const [stepUpPending, setStepUpPending] = useState(false);

  const form = draft ?? formFromHostedUi(stored);
  const isDirty = isHostedUiFormDirty(draft, stored);
  const isSaving = update.isPending || stepUpPending;

  const clearError = (field: HostedUiField | HostedUiColorKey) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const setField = (field: HostedUiField, value: string) => {
    if (!canWrite) return;
    onDraftChange({ ...form, [field]: value });
    clearError(field);
  };

  const setColor = (key: HostedUiColorKey, value: string) => {
    if (!canWrite) return;
    onDraftChange({ ...form, colors: { ...form.colors, [key]: value } });
    clearError(key);
  };

  const write = async (
    hostedUi: HostedUi | null,
    success: { title: string; description: string },
  ) => {
    setStepUpPending(true);
    try {
      if (!(await ensureStepUp())) return;
    } finally {
      setStepUpPending(false);
    }

    update.mutate(
      { hosted_ui: hostedUi },
      {
        onSuccess: () => {
          onDraftChange(null);
          setErrors({});
          toast.success(success.title, success.description);
        },
        onError: (error) =>
          toast.error("Could not save branding", getErrorMessage(error)),
      },
    );
  };

  const save = async () => {
    if (!canWrite || !isDirty) return;

    const result = validateHostedUiForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    await write(result.value, {
      title: "Branding saved",
      description: "The hosted sign-in and consent pages use the new branding.",
    });
  };

  const resetToDefaults = async () => {
    if (!canWrite || stored === null) return;

    if (
      !(await confirm({
        title: "Reset branding",
        description:
          "Remove all hosted page branding and return the sign-in and consent pages to their defaults? This applies immediately.",
        confirmLabel: "Reset",
        tone: "danger",
      }))
    ) {
      return;
    }

    await write(null, {
      title: "Branding reset",
      description: "The hosted pages are back to their default look.",
    });
  };

  const discard = () => {
    onDraftChange(null);
    setErrors({});
  };

  const colors = resolveHostedUiColors(form.colors);
  const contrast = checkHostedUiContrast(form.colors);
  const failing = contrast.filter((check) => !check.passes);
  const anyColorSet = HOSTED_UI_COLOR_KEYS.some((key) =>
    form.colors[key].trim(),
  );
  const previewLogo =
    form.logoUrl.trim() && isValidField("logoUrl", form.logoUrl)
      ? form.logoUrl.trim()
      : null;
  const previewFont =
    form.fontFamily.trim() && isValidField("fontFamily", form.fontFamily)
      ? form.fontFamily.trim()
      : HOSTED_UI_DEFAULT_FONT;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Brand Name"
          value={form.appName}
          placeholder={defaultAppName}
          helperText="Shown on the hosted pages in place of the app name above. Leave blank to use it."
          error={errors.appName}
          disabled={!canWrite}
          onChange={(value) => setField("appName", value)}
        />

        <div className="space-y-3">
          <Input
            label="Logo URL"
            value={form.logoUrl}
            placeholder="https://cdn.example.com/logo.svg"
            helperText="An https image with a plain host name. Leave blank to show the app name instead."
            error={errors.logoUrl}
            disabled={!canWrite}
            onChange={(value) => setField("logoUrl", value)}
          />
          {previewLogo && <LogoPreview key={previewLogo} url={previewLogo} />}
        </div>

        <Input
          label="Font Family"
          value={form.fontFamily}
          placeholder={HOSTED_UI_DEFAULT_FONT}
          helperText="Installed or system fonts only; the hosted pages load no web fonts. Quote a name with single quotes."
          error={errors.fontFamily}
          disabled={!canWrite}
          onChange={(value) => setField("fontFamily", value)}
        />
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-primary">Colors</div>
        <p className="text-sm text-muted">
          {anyColorSet
            ? "Custom colors are set, so the hosted pages show this palette in light and dark mode alike. Their built-in dark palette is turned off."
            : "No custom colors are set. The hosted pages use their default palette and follow the visitor's dark mode preference. The preview shows the light palette."}
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HOSTED_UI_COLOR_KEYS.map((key) => (
            <ColorField
              key={key}
              colorKey={key}
              value={form.colors[key]}
              error={errors[key]}
              disabled={!canWrite}
              onChange={(value) => setColor(key, value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-primary">
          Contrast (WCAG 2.2 AA)
        </div>
        {failing.length > 0 && (
          <StateMessage
            tone="warning"
            title={`${failing.length} color ${failing.length === 1 ? "pair is" : "pairs are"} below WCAG 2.2 AA`}
            description="Some visitors may not be able to read the hosted pages. You can still save these colors."
          />
        )}
        <ul className="grid gap-2 md:grid-cols-2" aria-label="Contrast checks">
          {contrast.map((check) => (
            <li
              key={check.id}
              className="flex items-center justify-between gap-3 rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm"
            >
              <span className="text-primary">{check.label}</span>
              <span
                className={
                  check.passes
                    ? "text-muted"
                    : "font-medium text-[var(--highlight)]"
                }
              >
                {formatRatio(check.ratio)}{" "}
                {check.passes
                  ? `passes (needs ${check.minimum}:1)`
                  : `below ${check.minimum}:1`}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          Text needs 4.5:1 and the primary color needs 3:1 against the card.
          Unset colors are checked at their defaults, and a color with
          transparency is blended over the color beneath it first.
        </p>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-primary">Preview</div>
        <HostedUiPreview
          appName={form.appName.trim() || defaultAppName}
          logoUrl={previewLogo}
          colors={colors}
          fontFamily={previewFont}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void save()}
          disabled={!canWrite || !isDirty || isSaving}
          className="btn btn-primary disabled:opacity-50"
        >
          {stepUpPending
            ? "Verifying..."
            : update.isPending
              ? "Saving..."
              : "Save Branding"}
        </button>
        <button
          onClick={discard}
          disabled={!isDirty || isSaving}
          className="btn btn-secondary disabled:opacity-50"
        >
          Undo Branding Edits
        </button>
        <button
          onClick={() => void resetToDefaults()}
          disabled={!canWrite || stored === null || isSaving}
          className="btn btn-secondary disabled:opacity-50"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

function isValidField(field: HostedUiField, value: string) {
  return validateHostedUiForm({ ...formFromHostedUi(null), [field]: value }).ok;
}

function ColorField({
  colorKey,
  value,
  error,
  disabled,
  onChange,
}: {
  colorKey: HostedUiColorKey;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const errorId = useId();
  const label = HOSTED_UI_COLOR_LABELS[colorKey];
  const fallback = HOSTED_UI_DEFAULT_COLORS[colorKey];

  return (
    <Field
      label={label}
      helperText={`${HOSTED_UI_COLOR_HINTS[colorKey]} Default ${fallback}.`}
      htmlFor={id}
      error={error}
      errorId={errorId}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={toColorInputValue(value, fallback)}
          disabled={disabled}
          onChange={(event) =>
            onChange(applyPickedColor(event.target.value, value))
          }
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-subtle bg-surface-alt p-1 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input
          id={id}
          value={value}
          placeholder={fallback}
          disabled={disabled}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={controlClassName}
        />
      </div>
    </Field>
  );
}

function LogoPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p className="text-sm text-muted" role="status">
        The logo could not be loaded here. Check the URL. This console's content
        security policy can also block images from other hosts, even when the
        hosted pages show them.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-subtle bg-surface-alt p-2">
      <img
        src={url}
        alt="Logo preview"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-10 max-w-[160px] object-contain"
      />
    </div>
  );
}
