/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createContext } from "react";

export type ConfirmTone = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

/**
 * Opens a styled confirmation dialog and resolves to the user's choice: true
 * when confirmed, false when cancelled or dismissed. Replaces window.confirm so
 * destructive actions are gated by an in-app, accessible, themed dialog.
 */
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// Outside a provider there is nothing to render, so the safe default is to
// decline rather than silently perform a destructive action.
export const ConfirmContext = createContext<ConfirmFn>(() =>
  Promise.resolve(false),
);
