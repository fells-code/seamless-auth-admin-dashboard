/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * Shared id scheme for a tab strip and the panel it controls, so `aria-controls`
 * and `aria-labelledby` agree without either side hardcoding the other's ids.
 */

/** Tab names can carry spaces, which are not valid in an id. */
export function tabId(idBase: string, tab: string) {
  return `${idBase}-tab-${tab.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function tabPanelId(idBase: string) {
  return `${idBase}-panel`;
}
