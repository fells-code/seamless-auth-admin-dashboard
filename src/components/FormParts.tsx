/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { StateMessage } from "./StateMessage";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FieldNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

export function DialogFooter({
  problem,
  isPending,
  submitDisabled,
  submitLabel,
  onClose,
}: {
  problem: string | null;
  isPending: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  onClose: () => void;
}) {
  return (
    <>
      {problem && (
        <StateMessage tone="error" title="Not saved" description={problem} />
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || submitDisabled}
          className="btn btn-primary disabled:opacity-50"
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </>
  );
}

export function ChipList({
  values,
  empty,
}: {
  values: readonly string[];
  empty: string;
}) {
  if (values.length === 0) {
    return <span className="text-xs text-muted">{empty}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full border border-subtle bg-surface-alt px-2 py-0.5 font-mono text-xs text-primary"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-subtle bg-surface px-6 py-6 lg:px-8 lg:py-8">
      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {eyebrow}
        </div>
        <h1 className="heading-1">{title}</h1>
        <p className="max-w-2xl text-sm text-muted">{children}</p>
      </div>
    </section>
  );
}

export function NeedsUpgrade({ what }: { what: string }) {
  return (
    <StateMessage
      tone="warning"
      title="Needs Seamless Auth API v0.23"
      description={`The API answered 404 for the ${what} routes, so there is nothing to manage here yet. Upgrade the API to v0.23 or later. If this console reaches the API through a server adapter, update the adapter too so it forwards these routes.`}
    />
  );
}
