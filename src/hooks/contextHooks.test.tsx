/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTheme } from "./useTheme";
import { useToast } from "./useToast";
import { ThemeContext, type ThemeContextValue } from "../lib/theme";
import { ToastContext, type ToastApi } from "../lib/toastContext";

describe("useTheme", () => {
  it("throws when used outside a ThemeProvider", () => {
    // React logs the thrown render error, which is noise for an expected throw.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useTheme())).toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleError.mockRestore();
  });

  it("returns the theme context when a provider is present", () => {
    const value = {
      mode: "dark",
      themeName: "winter",
      themes: [],
      setMode: vi.fn(),
      toggleMode: vi.fn(),
      setThemeName: vi.fn(),
    } as unknown as ThemeContextValue;

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
      ),
    });

    expect(result.current).toBe(value);
  });
});

describe("useToast", () => {
  it("falls back to a no-op api outside a provider so callers stay safe", () => {
    const { result } = renderHook(() => useToast());

    expect(() => result.current.success("saved")).not.toThrow();
    expect(() => result.current.error("failed")).not.toThrow();
  });

  it("returns the toast api when a provider is present", () => {
    const value = {
      showToast: vi.fn(() => "toast_1"),
      dismissToast: vi.fn(),
      success: vi.fn(() => "toast_1"),
      error: vi.fn(() => "toast_1"),
      warning: vi.fn(() => "toast_1"),
      info: vi.fn(() => "toast_1"),
    } as unknown as ToastApi;

    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
      ),
    });

    result.current.error("User creation failed", "User already exists");

    expect(value.error).toHaveBeenCalledWith(
      "User creation failed",
      "User already exists",
    );
  });
});
