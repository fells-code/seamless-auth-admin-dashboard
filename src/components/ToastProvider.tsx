/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  ToastContext,
  type ToastApi,
  type ToastInput,
  type ToastRecord,
  type ToastTone,
} from "../lib/toastContext";

const DEFAULT_DURATION_MS = 5000;
const ERROR_DURATION_MS = 8000;

const toneStyles: Record<ToastTone, string> = {
  success:
    "border-[color:var(--accent)]/35 bg-surface text-primary shadow-lg shadow-[color:var(--accent)]/10",
  error:
    "border-[color:var(--highlight)]/35 bg-surface text-primary shadow-lg shadow-[color:var(--highlight)]/10",
  warning:
    "border-[color:var(--primary)]/30 bg-surface text-primary shadow-lg shadow-[color:var(--accent-soft)]/20",
  info: "border-subtle bg-surface text-primary shadow-lg",
};

const iconStyles: Record<ToastTone, string> = {
  success: "text-[var(--accent)]",
  error: "text-[var(--highlight)]",
  warning: "text-[var(--primary)]",
  info: "text-muted",
};

const toneIcons = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, number>>(new Map());
  const nextId = useRef(0);

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, tone = "info", durationMs }: ToastInput) => {
      const id = `toast-${Date.now()}-${nextId.current++}`;
      const resolvedDuration =
        durationMs ??
        (tone === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);

      setToasts((current) =>
        [...current, { id, title, description, tone }].slice(-5),
      );

      if (resolvedDuration > 0) {
        const timer = window.setTimeout(() => {
          dismissToast(id);
        }, resolvedDuration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const activeTimers = timers.current;

    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo<ToastApi>(
    () => ({
      showToast,
      dismissToast,
      success: (title, description, options) =>
        showToast({ title, description, tone: "success", ...options }),
      error: (title, description, options) =>
        showToast({ title, description, tone: "error", ...options }),
      warning: (title, description, options) =>
        showToast({ title, description, tone: "warning", ...options }),
      info: (title, description, options) =>
        showToast({ title, description, tone: "info", ...options }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions removals"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(calc(100vw-2rem),24rem)] flex-col gap-3"
      >
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];

          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={clsx(
                "pointer-events-auto rounded-xl border px-4 py-3",
                toneStyles[toast.tone],
              )}
            >
              <div className="flex gap-3">
                <Icon
                  size={18}
                  className={clsx("mt-0.5 shrink-0", iconStyles[toast.tone])}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-sm font-medium text-primary">
                    {toast.title}
                  </div>
                  {toast.description && (
                    <div className="break-words text-sm text-muted">
                      {toast.description}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-md p-1 text-muted transition hover:bg-surface-alt hover:text-primary"
                  aria-label="Dismiss notification"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
