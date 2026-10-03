import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import noForeignRepoImport from "./eslint-rules/no-foreign-repo-import.mjs";
import noHardcodedJsxText from "./eslint-rules/no-hardcoded-jsx-text.mjs";
import noRawColors from "./eslint-rules/no-raw-colors.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // next already registers jsx-a11y. Re-applying recommended would
    // redefine the plugin, so only the rule severities are raised to error.
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    plugins: {
      intgetion: {
        rules: {
          "no-foreign-repo-import": noForeignRepoImport,
          "no-hardcoded-jsx-text": noHardcodedJsxText,
          "no-raw-colors": noRawColors,
        },
      },
    },
    rules: {
      "intgetion/no-foreign-repo-import": "error",
      "intgetion/no-hardcoded-jsx-text": "error",
    },
  },
  {
    // Design tokens only (docs/DESIGN.md 13, D140); the kit maps them itself.
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: { "intgetion/no-raw-colors": "error" },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
