/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// Mirrors the declaration in src/lib/runtimeConfig.ts. The E2E project does not
// include src, and the specs assert that the app resolved its API URL from the
// runtime config the harness injects.
declare global {
  interface Window {
    __SEAMLESS_CONFIG__?: {
      API_URL: string;
    };
  }
}

export {};
