/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useId, useState } from "react";
import type { LoginMethod } from "@seamless-auth/types";
import {
  AAGUID_PATTERN,
  controlClassName,
  LOGIN_METHOD_OPTIONS,
} from "../lib/configFields";

export function Field({
  label,
  helperText,
  htmlFor,
  error,
  errorId,
  children,
}: {
  label: string;
  helperText?: string;
  htmlFor?: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  const labelId = useId();

  const messages = (
    <>
      {helperText && <p className="text-sm text-muted">{helperText}</p>}
      {error && (
        <p id={errorId} className="text-sm text-[var(--highlight)]">
          {error}
        </p>
      )}
    </>
  );

  // With a single control, the text is a real label. A group of controls has
  // nothing to point at, so it becomes a group name instead of an orphan label.
  if (htmlFor) {
    return (
      <div className="space-y-2">
        <label
          htmlFor={htmlFor}
          className="text-xs uppercase tracking-[0.18em] text-muted"
        >
          {label}
        </label>
        {children}
        {messages}
      </div>
    );
  }

  return (
    <div className="space-y-2" role="group" aria-labelledby={labelId}>
      <div
        id={labelId}
        className="text-xs uppercase tracking-[0.18em] text-muted"
      >
        {label}
      </div>
      {children}
      {messages}
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  helperText,
  disabled,
  error,
  readOnly,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helperText?: string;
  disabled?: boolean;
  error?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const errorId = useId();

  return (
    <Field
      label={label}
      helperText={helperText}
      htmlFor={id}
      error={error}
      errorId={errorId}
    >
      <input
        id={id}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={controlClassName}
      />
    </Field>
  );
}

/**
 * A numeric field that never reports a value it was not given.
 *
 * The previous implementation passed `Number(e.target.value)` straight through,
 * so clearing the field staged a 0. A rate limit or lockout threshold of 0
 * changes authentication behaviour drastically, and nothing said so. Values
 * below `min`, non-integers, and an empty field are now held locally and
 * reported inline instead of being staged. Blur restores the last staged value,
 * so what is displayed is always what would be saved.
 */
export function NumberInput({
  label,
  value,
  onChange,
  helperText,
  disabled,
  min = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  helperText?: string;
  disabled?: boolean;
  min?: number;
}) {
  const id = useId();
  const errorId = useId();
  const [pending, setPending] = useState<string | null>(null);

  const text = pending ?? String(value);
  const parsed = Number(text);
  const invalid =
    text.trim() === "" || !Number.isInteger(parsed) || parsed < min;

  const handleChange = (next: string) => {
    setPending(next);

    const candidate = Number(next);
    if (next.trim() === "" || !Number.isInteger(candidate) || candidate < min) {
      return;
    }

    onChange(candidate);
  };

  return (
    <Field
      label={label}
      helperText={helperText}
      htmlFor={id}
      error={invalid ? `Enter a whole number of ${min} or greater.` : undefined}
      errorId={errorId}
    >
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={text}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setPending(null)}
        className={controlClassName}
      />
    </Field>
  );
}

export function LoginMethodSelector({
  value,
  onChange,
  canWrite,
}: {
  value: LoginMethod[];
  onChange: (v: LoginMethod[]) => void;
  canWrite: boolean;
}) {
  const toggle = (method: LoginMethod) => {
    const enabled = value.includes(method);

    if (enabled) {
      if (value.length === 1) return;
      onChange(value.filter((current) => current !== method));
      return;
    }

    onChange([...value, method]);
  };

  return (
    <Field
      label="Enabled Login Methods"
      helperText="At least one login method must remain enabled."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {LOGIN_METHOD_OPTIONS.map((option) => {
          const checked = value.includes(option.value);
          const disabled = !canWrite || (checked && value.length === 1);

          return (
            <label
              key={option.value}
              className={`flex min-h-24 items-start gap-3 rounded-md border border-subtle bg-surface-alt p-4 transition has-[:checked]:border-[var(--primary)] has-[:checked]:bg-surface ${
                canWrite
                  ? "cursor-pointer hover:border-[var(--primary)]"
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.value)}
                className="mt-1 h-4 w-4 rounded border-subtle accent-[var(--primary)] disabled:opacity-50"
              />

              <span className="space-y-1">
                <span className="block text-sm font-medium text-primary">
                  {option.label}
                </span>
                <span className="block text-sm text-muted">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </Field>
  );
}

export function CheckboxField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-md border border-subtle bg-surface-alt p-4 transition ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-[var(--primary)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-subtle accent-[var(--primary)] disabled:cursor-not-allowed"
      />

      <span className="space-y-1">
        <span className="block text-sm font-medium text-primary">{label}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  helperText,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  helperText?: string;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <Field label={label} helperText={helperText} htmlFor={id}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={controlClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function AaguidListEditor({
  label,
  helperText,
  aaguids,
  setAaguids,
  canWrite,
}: {
  label: string;
  helperText: string;
  aaguids: string[];
  setAaguids: (v: string[]) => void;
  canWrite: boolean;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();

  const add = () => {
    if (!canWrite) return;

    // AAGUIDs are compared as they were recorded, so casing must not decide
    // whether a model matches.
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return;

    if (!AAGUID_PATTERN.test(trimmed)) {
      setError(
        "Enter an AAGUID as a UUID, such as adce0002-35bc-c60a-648b-0b25f1f05503.",
      );
      return;
    }

    if (aaguids.includes(trimmed)) {
      setError("That AAGUID is already on this list.");
      return;
    }

    setAaguids([...aaguids, trimmed]);
    setInput("");
    setError("");
  };

  return (
    <div className="space-y-3">
      <Field
        label={label}
        helperText={helperText}
        htmlFor={inputId}
        error={error || undefined}
      >
        <div className="flex gap-2">
          <input
            id={inputId}
            value={input}
            disabled={!canWrite}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            className={`flex-1 ${controlClassName}`}
            placeholder="adce0002-35bc-c60a-648b-0b25f1f05503"
          />

          <button
            onClick={add}
            disabled={!canWrite}
            className="btn btn-secondary"
          >
            Add
          </button>
        </div>
      </Field>

      {aaguids.map((aaguid) => (
        <div
          key={aaguid}
          className="flex items-center justify-between gap-3 rounded-md border border-subtle bg-surface px-3 py-2 text-sm"
        >
          <span className="truncate font-mono text-primary">{aaguid}</span>

          <button
            onClick={() =>
              setAaguids(aaguids.filter((value) => value !== aaguid))
            }
            disabled={!canWrite}
            aria-label={`Remove ${aaguid}`}
            className="text-[var(--highlight)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
