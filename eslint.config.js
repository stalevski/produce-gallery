import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "playwright-report", "test-results", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // react-hooks v6 ships aggressive React-Compiler-era rules that flag
      // several deliberate, documented patterns in this codebase (the two-phase
      // modal mount in DetailView, cache hydration on mount, the random-sort
      // shuffle). Keep them visible as warnings rather than blocking CI; see
      // AGENTS.md before "fixing" the patterns they point at.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  // Node scripts (snapshot generator, screenshot helpers).
  {
    files: ["scripts/**/*.mjs", "*.config.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
);
