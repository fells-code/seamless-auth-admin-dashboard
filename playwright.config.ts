/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { defineConfig, devices } from "@playwright/test";

// Not Vite's default preview port: another project already listening on 4173
// is silently reused by `reuseExistingServer`, and the suite then runs against
// the wrong app.
const PORT = 4287;
// localhost, not 127.0.0.1: WebAuthn requires the relying-party ID to be a
// registrable domain, and an IP address is not one, so passkey ceremonies fail
// outright against an IP origin.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  // A stray `test.only` would quietly reduce CI to one spec.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      // The virtual authenticator is driven over CDP, which is Chromium only,
      // and passkeys are the dashboard's primary sign-in path.
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // Serves the real build, so runtime config injection and the router
    // basename behave the way they do in the container.
    // Bound on every interface: preview otherwise listens on one address, and
    // localhost resolves to ::1 first on macOS and to 127.0.0.1 on CI.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
