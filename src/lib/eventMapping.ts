/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/lib/eventTypeMapping.ts
import { getEventCategory } from "./eventCategories";

export function collapseTypes(types: string[]): string {
  if (!types || types.length === 0) return "";

  const matchedCategory = types
    .map((type) => getEventCategory(type))
    .find((category) => category.value !== "other");

  return matchedCategory?.value ?? types[0];
}
