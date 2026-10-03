import { describe, expect, it } from "vitest";
import {
  normalizeSkillText,
  toAliasNormalized,
} from "../service/normalize-skill-text";

describe("normalizeSkillText", () => {
  it("maps the section 11.1 React examples to react", () => {
    expect(normalizeSkillText("React.js")).toBe("react");
    expect(normalizeSkillText("ReactJS")).toBe("react");
    expect(normalizeSkillText("react 18")).toBe("react");
    expect(normalizeSkillText("  React.JS  ")).toBe("react");
    expect(normalizeSkillText("react@18")).toBe("react");
    expect(normalizeSkillText("react v18")).toBe("react");
  });

  it("strips a glued js suffix only when a stem remains", () => {
    expect(normalizeSkillText("Node.js")).toBe("node");
    expect(normalizeSkillText("NodeJS")).toBe("node");
    expect(normalizeSkillText("Next.js")).toBe("next");
    expect(normalizeSkillText("JS")).toBe("js");
    expect(toAliasNormalized("ReactJS")).toBe("reactjs");
    expect(toAliasNormalized("Node.js")).toBe("node");
  });

  it("drops version numbers and punctuation and keeps short product tokens", () => {
    expect(normalizeSkillText("Python 3.11")).toBe("python");
    expect(normalizeSkillText("html5")).toBe("html");
    expect(normalizeSkillText("C++")).toBe("cpp");
    expect(normalizeSkillText("C#")).toBe("csharp");
    expect(normalizeSkillText("GA4")).toBe("ga4");
    expect(normalizeSkillText("K8s")).toBe("k8s");
    expect(normalizeSkillText("A/B Testing")).toBe("abtesting");
    expect(normalizeSkillText("FP&A")).toBe("fpa");
  });

  it("returns an empty key when nothing lexical remains", () => {
    expect(normalizeSkillText("   ")).toBe("");
    expect(normalizeSkillText("@@@")).toBe("");
    expect(normalizeSkillText("18")).toBe("");
    expect(normalizeSkillText("v2.1")).toBe("");
  });
});
