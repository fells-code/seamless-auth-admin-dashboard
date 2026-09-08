/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { test as base, expect } from "@playwright/test";
import { MockApi } from "./mockApi";
import { NOW, resetFactorySequence } from "./factories";
import { seedDeployment, seedPersona, type PersonaName } from "./personas";
import {
  createVirtualAuthenticator,
  type VirtualAuthenticator,
} from "./webauthn";

type Fixtures = {
  /** The mocked server adapter. Re-register a route to override the seed. */
  api: MockApi;
  /** Seeds a session and navigates. Defaults to a write admin. */
  signInAs: (persona: PersonaName, path?: string) => Promise<void>;
  virtualAuthenticator: VirtualAuthenticator;
};

export const test = base.extend<Fixtures>({
  api: async ({ page, baseURL }, use) => {
    resetFactorySequence();

    // The clock is frozen so relative copy ("2h ago") and relative ranges
    // resolve to the same values on every run.
    await page.clock.install({ time: NOW });

    const api = new MockApi(page);

    // Same origin as the app under test: every request is intercepted before it
    // leaves the browser, and nothing depends on a second server or on CORS.
    await api.install(baseURL!);
    seedDeployment(api);

    await use(api);

    // A route the app started calling would otherwise show up as an empty
    // screen and a passing test.
    const missed = api.unhandledCalls();
    expect(
      missed.map((call) => `${call.method} ${call.path}`),
      "the app called endpoints with no mock registered",
    ).toEqual([]);
  },

  signInAs: async ({ page, api }, use) => {
    await use(async (persona, path = "/") => {
      seedPersona(api, persona);
      await page.goto(path);
    });
  },

  virtualAuthenticator: async ({ page }, use) => {
    const authenticator = await createVirtualAuthenticator(page);

    await use(authenticator);
    await authenticator.dispose();
  },
});

export { expect };
