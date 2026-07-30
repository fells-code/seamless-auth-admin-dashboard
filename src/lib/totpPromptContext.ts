/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createContext } from "react";

/**
 * Opens a dialog asking for a TOTP code and resolves to the trimmed code, or
 * null when the operator cancels.
 *
 * Step-up needs an interactive prompt when the account has no passkey to
 * assert. Outside a provider there is nothing to render, so the safe default is
 * to decline rather than to block on a promise that never settles.
 */
export type TotpPromptFn = () => Promise<string | null>;

export const TotpPromptContext = createContext<TotpPromptFn>(() =>
  Promise.resolve(null),
);
