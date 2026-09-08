/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import clsx from "clsx";
import { useRef, type KeyboardEvent } from "react";

import { tabId, tabPanelId } from "../lib/tabIds";

export default function Tabs({
  tabs,
  active,
  onChange,
  idBase,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  idBase: string;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = tabs.indexOf(active);
  // An active value outside `tabs` would leave every button at tabindex -1 and
  // drop the whole strip out of the tab order, so the first tab holds the stop.
  const focusIndex = activeIndex === -1 ? 0 : activeIndex;

  function moveTo(index: number) {
    buttons.current[index]?.focus();
    onChange(tabs[index]);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const last = tabs.length - 1;

    switch (event.key) {
      case "ArrowRight":
        moveTo(index === last ? 0 : index + 1);
        break;
      case "ArrowLeft":
        moveTo(index === 0 ? last : index - 1);
        break;
      case "Home":
        moveTo(0);
        break;
      case "End":
        moveTo(last);
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  return (
    <div
      role="tablist"
      className="inline-flex gap-1 rounded-lg border border-subtle bg-surface-alt p-1"
    >
      {tabs.map((tab, index) => {
        const isActive = active === tab;

        return (
          <button
            key={tab}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="tab"
            id={tabId(idBase, tab)}
            aria-selected={isActive}
            aria-controls={tabPanelId(idBase)}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={clsx(
              "px-3 py-1.5 text-sm rounded-md transition-all duration-150 cursor-pointer",
              isActive
                ? "bg-surface text-primary shadow-sm"
                : "text-muted hover:text-primary hover:bg-surface",
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
