/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import clsx from "clsx";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function focusableWithin(container: HTMLElement): HTMLElement[] {
  // Deliberately not filtering on offsetParent: it is null for anything inside
  // a fixed-position ancestor, which is exactly what a modal is, and it is
  // always null under jsdom. Hidden markup is the thing worth excluding.
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => !node.hasAttribute("hidden") && !node.closest("[aria-hidden]"),
  );
}

/**
 * A modal dialog with the behaviour assistive technology and keyboard users
 * expect: it announces itself as a dialog, keeps focus inside while open,
 * closes on Escape, and hands focus back to whatever opened it.
 */
export default function Dialog({
  title,
  description,
  onClose,
  children,
  className,
  labelledBy,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Overrides the generated heading id when the caller renders its own title. */
  labelledBy?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    // The page behind a modal should not scroll under it.
    document.body.style.overflow = "hidden";

    const container = dialogRef.current;
    const first = container ? focusableWithin(container)[0] : null;
    (first ?? container)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      // Returning focus to the trigger keeps keyboard position from resetting
      // to the top of the document on close.
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;

      const focusable = focusableWithin(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at both ends so Tab cannot escape into the page behind.
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Presentational backdrop. It is not a control, so it is not a tab stop;
          Escape and the dialog's own close control are the keyboard paths out. */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={clsx(
          "relative w-full max-w-md rounded-xl border border-subtle bg-surface p-6 shadow-lg space-y-5",
          className,
        )}
      >
        {!labelledBy && (
          <div className="space-y-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-subtle text-xs">
                {description}
              </p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
