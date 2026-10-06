/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<{ roles: string[] }>("/system-config/roles"),
  });
}
