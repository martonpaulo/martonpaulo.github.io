import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/", ".astro/", "node_modules/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  prettier,
  {
    languageOptions: { globals: globals.node },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
);
