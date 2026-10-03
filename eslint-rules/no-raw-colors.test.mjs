import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import { describe, expect, it } from "vitest";
import rule from "./no-raw-colors.mjs";

const linter = new Linter({ configType: "flat" });

const config = [
  {
    files: ["**/*.tsx"],
    languageOptions: {
      parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { intgetion: { rules: { "no-raw-colors": rule } } },
    rules: { "intgetion/no-raw-colors": "error" },
  },
];

const lint = (code) => linter.verify(code, config, "view.tsx");

describe("no-raw-colors", () => {
  it("flags palette colours and hex values in class strings", () => {
    expect(lint('const a = <p className="bg-zinc-900 p-4" />;')).toHaveLength(1);
    expect(lint('const a = <p className="hover:text-white" />;')).toHaveLength(1);
    expect(lint('const a = <p className="border-blue-500/50" />;')).toHaveLength(1);
    expect(lint('const a = <p className={cn("bg-[#ff0000]", x)} />;')).toHaveLength(1);
    expect(lint("const a = <p className={`p-2 text-black ${x}`} />;")).toHaveLength(1);
  });

  it("allows design tokens and non-class strings", () => {
    expect(
      lint('const a = <p className="bg-surface text-fg-muted border-line" />;'),
    ).toHaveLength(0);
    expect(lint('const a = <p className="text-danger bg-accent" />;')).toHaveLength(0);
    expect(lint('const colour = "text-white"; const b = <p title={colour} />;')).toHaveLength(0);
    expect(lint('const a = <p className="whitespace-pre-wrap" />;')).toHaveLength(0);
  });
});
