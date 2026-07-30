/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * The focusable elements inside a container, in document order.
 *
 * Deliberately not filtering on offsetParent: it is null for anything inside a
 * fixed-position ancestor, which is exactly what a modal is, and it is always
 * null under jsdom. Hidden markup is the thing worth excluding.
 */
export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => !node.hasAttribute("hidden") && !node.closest("[aria-hidden]"),
  );
}

/**
 * Keep Tab inside `container`, wrapping at both ends.
 *
 * Returns true when the event was handled, so callers can decide what else a
 * Tab press should do. Anything advertising `aria-modal` has to do this, or the
 * page behind it stays reachable and the modal semantics are a lie.
 */
export function trapTabKey(event: KeyboardEvent, container: HTMLElement) {
  if (event.key !== "Tab") return false;

  const focusable = focusableWithin(container);

  if (focusable.length === 0) {
    // Nothing to move to, so keep focus on the container itself.
    event.preventDefault();
    container.focus();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
    return true;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}
