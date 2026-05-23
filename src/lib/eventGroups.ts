/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/lib/eventGroups.ts
import { eventCategories } from "./eventCategories";

export const eventGroups = [
  {
    label: "All",
    value: "",
    match: () => true,
  },
  ...eventCategories,
];
