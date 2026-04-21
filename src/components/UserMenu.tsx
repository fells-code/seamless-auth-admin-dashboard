/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

// src/components/UserMenu.tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@seamless-auth/react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../hooks/useTheme";

function getInitials(email: string) {
  if (!email) return "?";
  return email
    .split("@")[0]
    .split(".")
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

function timeAgo(date?: string) {
  if (!date) return "unknown";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { themeName, setThemeName, themes } = useTheme();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-lg px-3 py-1.5 transition hover:bg-[var(--surface-alt)]"
      >
        {/* Avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {getInitials(user.email)}
        </div>

        {/* Info */}
        <div className="hidden text-left sm:block">
          <div className="text-sm font-medium">{user.email}</div>
          <div className="text-xs text-[var(--text-muted)]">
            last login: {timeAgo(user.lastLogin)}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-subtle bg-surface p-2 shadow-lg">
          <div className="border-b border-subtle px-3 pb-3 pt-2">
            <div className="text-sm font-medium">Appearance</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Choose a color theme and light or dark mode.
            </div>
          </div>

          <div className="space-y-2 px-2 py-3">
            {themes.map((theme) => {
              const active = theme.value === themeName;

              return (
                <button
                  key={theme.value}
                  onClick={() => setThemeName(theme.value)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--surface-alt)] shadow-sm"
                      : "border-subtle hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{theme.label}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {theme.description}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {theme.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="h-4 w-4 rounded-full border border-white/40"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="pt-1">
              <ThemeToggle />
            </div>
          </div>

          <div className="border-t border-subtle px-2 pt-2">
            <button
              onClick={() => {
                navigate("/profile");
                setOpen(false);
              }}
              className="w-full rounded-lg px-4 py-2 text-left text-sm transition hover:bg-[var(--surface-alt)]"
            >
              Profile
            </button>

            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full rounded-lg px-4 py-2 text-left text-sm text-[var(--highlight)] transition hover:bg-[var(--surface-alt)]"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
