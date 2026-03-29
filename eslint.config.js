import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import licenseHeader from "eslint-plugin-license-header";

export default defineConfig([
  globalIgnores([
    "dist",
    "node_modules/**",
    "coverage/**",
    "**.config.**",
    "tests/**",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      "license-header": licenseHeader,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "license-header/header": ["error", "./resources/license-header.js"],
    },
  },
]);
