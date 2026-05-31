/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { AlertTriangle, Info, LockKeyhole, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { getErrorMessage } from "../lib/errorMessage";

type Tone = "error" | "warning" | "info";

const toneStyles: Record<Tone, string> = {
  error:
    "border-[color:var(--highlight)]/35 bg-[color:var(--highlight)]/10 text-[var(--highlight)]",
  warning:
    "border-[color:var(--primary)]/30 bg-[color:var(--accent-soft)]/55 text-primary",
  info: "border-subtle bg-surface-alt text-primary",
};

const toneIcons = {
  error: AlertTriangle,
  warning: LockKeyhole,
  info: Info,
};

export function StateMessage({
  title,
  description,
  tone = "info",
  action,
}: {
  title: string;
  description?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
}) {
  const Icon = toneIcons[tone];

  return (
    <div
      className={clsx("rounded-xl border px-4 py-3 text-sm", toneStyles[tone])}
      role={tone === "error" ? "alert" : "status"}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 shrink-0">
            <Icon size={18} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="font-medium">{title}</div>
            {description && (
              <div className="text-muted break-words">{description}</div>
            )}
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function QueryErrorState({
  title = "Could not load this view",
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <StateMessage
      tone="error"
      title={title}
      description={getErrorMessage(error)}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        ) : undefined
      }
    />
  );
}

export function ReadOnlyNotice({
  description = "You have read-only admin access. Destructive and high-sensitivity controls are hidden or disabled.",
}: {
  description?: ReactNode;
}) {
  return (
    <StateMessage
      tone="warning"
      title="Read-only access"
      description={description}
    />
  );
}
