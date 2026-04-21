import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/components/**/*.tsx", "src/lib/**/*.ts"],
      exclude: [
        "src/main.tsx",
        "src/App.tsx",
        "src/lib/api.ts",
        "src/lib/runtimeConfig.ts",
      ],
    },
  },
});
