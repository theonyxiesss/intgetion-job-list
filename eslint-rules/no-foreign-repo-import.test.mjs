import path from "node:path";
import { ESLint, Linter } from "eslint";
import { describe, expect, it } from "vitest";
import rule from "./no-foreign-repo-import.mjs";

const root = process.cwd();

const linter = new Linter({ configType: "flat" });

const ruleConfig = [
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    plugins: {
      intgetion: {
        rules: {
          "no-foreign-repo-import": rule,
        },
      },
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "intgetion/no-foreign-repo-import": "error",
    },
  },
];

/**
 * @param {string} code
 * @param {string} filename
 */
function lint(code, filename) {
  return linter.verify(code, ruleConfig, {
    filename: path.join(root, filename),
  });
}

/**
 * @param {unknown} setting
 */
function isError(setting) {
  if (setting === "error" || setting === 2) return true;
  return Array.isArray(setting) && (setting[0] === "error" || setting[0] === 2);
}

describe("no-foreign-repo-import", () => {
  it("rejects a repo import from another module", () => {
    const messages = lint(
      'import { jobs } from "@/modules/jobs/repo";\n',
      "src/modules/companies/service/index.ts",
    );
    expect(messages.map((message) => message.messageId)).toEqual([
      "foreignRepo",
    ]);
  });

  it("allows a module to import its own repo", () => {
    const messages = lint(
      'import { jobs } from "../repo";\n',
      "src/modules/jobs/service/index.ts",
    );
    expect(messages).toEqual([]);
  });

  it("rejects contacts/repo outside contacts/service", () => {
    const messages = lint(
      'import { contacts } from "../repo";\n',
      "src/modules/contacts/api/index.ts",
    );
    expect(messages.map((message) => message.messageId)).toEqual([
      "contactsRepo",
    ]);
  });

  it("allows contacts/service to import contacts/repo", () => {
    const messages = lint(
      'import { contacts } from "../repo";\n',
      "src/modules/contacts/service/index.ts",
    );
    expect(messages).toEqual([]);
  });

  it("rejects a dynamic import of a foreign repo", () => {
    const messages = lint(
      'export const load = () => import("@/modules/jobs/repo");\n',
      "src/app/api/jobs/route.ts",
    );
    expect(messages.map((message) => message.messageId)).toEqual([
      "foreignRepo",
    ]);
  }, 15000);
});

describe("eslint config", () => {
  it("enables the repo boundary rule and jsx-a11y as errors", async () => {
    const eslint = new ESLint({ cwd: process.cwd() });
    const config = await eslint.calculateConfigForFile("src/app/page.tsx");
    expect(isError(config.rules?.["intgetion/no-foreign-repo-import"])).toBe(
      true,
    );
    expect(isError(config.rules?.["jsx-a11y/alt-text"])).toBe(true);
    expect(
      isError(config.rules?.["jsx-a11y/click-events-have-key-events"]),
    ).toBe(true);
  }, 15000);
});
