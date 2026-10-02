import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import { describe, expect, it } from "vitest";
import rule from "./no-hardcoded-jsx-text.mjs";

const linter = new Linter({ configType: "flat" });

const config = [
  {
    files: ["**/*.tsx"],
    languageOptions: {
      parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      intgetion: { rules: { "no-hardcoded-jsx-text": rule } },
    },
    rules: { "intgetion/no-hardcoded-jsx-text": "error" },
  },
];

describe("no-hardcoded-jsx-text", () => {
  it("flags visible JSX text and allows translations", () => {
    const hardcoded = linter.verify(
      "export function View(){ return <p>Hello</p>; }",
      config,
      "view.tsx",
    );
    expect(hardcoded).toHaveLength(1);

    const translated = linter.verify(
      "export function View(){ return <p>{t('home.tagline')}</p>; }",
      config,
      "view.tsx",
    );
    expect(translated).toHaveLength(0);
  });
});
