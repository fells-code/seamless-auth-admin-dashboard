/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useCallback, useRef, useState, type ReactNode } from "react";
import Dialog from "./Dialog";
import { TotpPromptContext, type TotpPromptFn } from "../lib/totpPromptContext";

export default function TotpPromptProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  // Mirrors ConfirmProvider: the resolver is only touched from callbacks, never
  // during render, so the dialog can settle the awaiting caller safely.
  const resolveRef = useRef<((code: string | null) => void) | null>(null);

  const settle = useCallback((value: string | null) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOpen(false);
    setCode("");
    resolve?.(value);
  }, []);

  const promptForTotp = useCallback<TotpPromptFn>(() => {
    return new Promise<string | null>((resolve) => {
      // A second request while one is open cancels the first, so its caller is
      // not left awaiting a promise that never settles.
      resolveRef.current?.(null);
      resolveRef.current = resolve;
      setCode("");
      setOpen(true);
    });
  }, []);

  const trimmed = code.trim();

  return (
    <TotpPromptContext.Provider value={promptForTotp}>
      {children}

      {open && (
        <Dialog
          title="Verification required"
          description="Enter the current code from your authenticator app to continue."
          onClose={() => settle(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (trimmed.length >= 6) settle(trimmed);
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="step-up-totp"
                className="text-xs uppercase tracking-[0.18em] text-muted"
              >
                Authenticator code
              </label>
              <input
                id="step-up-totp"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className="w-full rounded-md border border-subtle bg-surface-alt px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => settle(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={trimmed.length < 6}
                className="btn btn-primary disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </TotpPromptContext.Provider>
  );
}
