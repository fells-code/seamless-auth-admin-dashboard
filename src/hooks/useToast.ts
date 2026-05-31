/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useContext } from "react";
import { ToastContext } from "../lib/toastContext";

export function useToast() {
  return useContext(ToastContext);
}
