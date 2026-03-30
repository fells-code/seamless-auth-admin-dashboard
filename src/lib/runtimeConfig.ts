/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

declare global {
  interface Window {
    __SEAMLESS_CONFIG__?: {
      API_URL: string;
    };
  }
}

export function getApiUrl(): string {
  if (window.__SEAMLESS_CONFIG__?.API_URL) {
    return window.__SEAMLESS_CONFIG__.API_URL;
  }

  return import.meta.env.VITE_API_URL;
}
