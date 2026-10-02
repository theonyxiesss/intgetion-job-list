import { describe, expect, it } from "vitest";
import en from "./en.json";
import ru from "./ru.json";

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, nested]) =>
    keys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe("messages", () => {
  it("keeps the product name and the same keys in en and ru", () => {
    expect(en.product.name).toBe("INTGETION JOB LIST");
    expect(ru.product.name).toBe("INTGETION JOB LIST");
    expect(keys(en).sort()).toEqual(keys(ru).sort());
  });
});
