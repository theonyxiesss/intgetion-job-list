import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import noForeignRepoImport from "./eslint-rules/no-foreign-repo-import.mjs";

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
        },
      },
    },
    rules: {
      "intgetion/no-foreign-repo-import": "error",
    },
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
