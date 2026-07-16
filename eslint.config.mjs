import js from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";
import localRules from "./tools/eslint-rules.mjs";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "next-env.d.ts",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
      secondbrain: localRules,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "secondbrain/feature-boundaries": "error",
      "secondbrain/no-tailwind-arbitrary-values": "error",
      "secondbrain/no-public-secret": "error",
      "secondbrain/no-raw-process-env": "error",
    },
  },
);
