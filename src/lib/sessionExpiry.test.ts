/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  notifySessionExpired,
  onSessionExpired,
  resetSessionExpiryNotice,
} from "./sessionExpiry";

describe("sessionExpiry", () => {
  beforeEach(() => {
    resetSessionExpiryNotice();
  });

  it("notifies the registered listener", () => {
    const listener = vi.fn();
    onSessionExpired(listener);

    notifySessionExpired();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("collapses a burst of expiries into one notification", () => {
    const listener = vi.fn();
    onSessionExpired(listener);

    // A screen with several panels fires several requests at once, and every
    // one of them comes back 401. That must produce one redirect, not six.
    notifySessionExpired();
    notifySessionExpired();
    notifySessionExpired();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("re-arms after a reset", () => {
    const listener = vi.fn();
    onSessionExpired(listener);

    notifySessionExpired();
    resetSessionExpiryNotice();
    notifySessionExpired();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops notifying once unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);

    unsubscribe();
    notifySessionExpired();

    expect(listener).not.toHaveBeenCalled();
  });
});
