/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { expect, type Page } from "@playwright/test";

/**
 * Wait for the authenticated shell rather than for a fixed delay.
 *
 * RequireAuth holds the screen on its loading state until the session resolves,
 * so asserting on page content before the navigation lands is the main source
 * of flake in these specs.
 */
export async function waitForShell(page: Page) {
  await expect(
    page.getByRole("navigation").or(page.getByRole("banner")),
  ).toBeVisible();
}

export async function gotoAs(page: Page, path: string) {
  await page.goto(path);
  await waitForShell(page);
}

// Toasts live in the announcement region and a page's own inline alert does
// not. Both carry the same message on a failure, so an unscoped role query
// matches two elements and trips Playwright's strict mode.
const TOAST_REGION = '[aria-live="polite"]';

export function toast(page: Page, text: string | RegExp) {
  return page.locator(TOAST_REGION).filter({ hasText: text });
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(toast(page, text)).toBeVisible();
}

/** The alert a page renders itself, as opposed to a toast. */
export function inlineAlert(page: Page) {
  return page.locator(`[role="alert"]:not(${TOAST_REGION} *)`);
}

export async function expectInlineAlert(page: Page, text: string | RegExp) {
  await expect(inlineAlert(page)).toContainText(text);
}

export async function confirmDialog(page: Page, confirmLabel: string | RegExp) {
  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel }).click();
  await expect(dialog).toBeHidden();
}

export async function dismissDialog(page: Page) {
  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /cancel/i }).click();
  await expect(dialog).toBeHidden();
}

export async function expectEmptyState(page: Page, title: string | RegExp) {
  await expect(page.getByText(title)).toBeVisible();
}

export async function expectErrorState(page: Page, title: string | RegExp) {
  await expect(inlineAlert(page).filter({ hasText: title })).toBeVisible();
}
