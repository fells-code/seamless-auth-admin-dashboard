/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import ThemeProvider from "./components/ThemeProvider";
import ToastProvider from "./components/ToastProvider";
import ConfirmProvider from "./components/ConfirmProvider";
import TotpPromptProvider from "./components/TotpPromptProvider";
import { shouldRetryQuery } from "./lib/queryRetry";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <TotpPromptProvider>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </TotpPromptProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
