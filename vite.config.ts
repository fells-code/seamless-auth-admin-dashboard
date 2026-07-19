import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load VITE_* vars from .env files and the shell so the Vite base path can be
  // set per build (root build vs auth-instance /console). VITE_BASE_PATH and
  // VITE_SAME_ORIGIN reach client code through import.meta.env directly.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const basePath = env.VITE_BASE_PATH || "/";

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "json-summary"],
        include: [
          "src/components/**/*.tsx",
          "src/hooks/**/*.ts",
          "src/lib/**/*.ts",
          "src/pages/**/*.tsx",
        ],
        exclude: [
          "src/main.tsx",
          "src/App.tsx",
          "src/lib/api.ts",
          "src/lib/runtimeConfig.ts",
        ],
      },
    },
  };
});
