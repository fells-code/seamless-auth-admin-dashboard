/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createContext } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

export type ToastRecord = Required<Pick<ToastInput, "title" | "tone">> &
  Omit<ToastInput, "title" | "tone"> & {
    id: string;
  };

export type ToastOptions = Pick<ToastInput, "durationMs">;

export type ToastApi = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
  success: (
    title: string,
    description?: string,
    options?: ToastOptions,
  ) => string;
  error: (
    title: string,
    description?: string,
    options?: ToastOptions,
  ) => string;
  warning: (
    title: string,
    description?: string,
    options?: ToastOptions,
  ) => string;
  info: (title: string, description?: string, options?: ToastOptions) => string;
};

export const noopToastApi: ToastApi = {
  showToast: () => "",
  dismissToast: () => undefined,
  success: () => "",
  error: () => "",
  warning: () => "",
  info: () => "",
};

export const ToastContext = createContext<ToastApi>(noopToastApi);
