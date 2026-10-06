import { describe, expect, it } from "vitest";
import { hashPreservingEntryHtml, localeEntryPath } from "./hash-entry";

describe("locale entry that keeps the URL fragment (D319)", () => {
  it("accepts the locale the middleware would have redirected to", () => {
    expect(localeEntryPath("https://intgetion.com/en")).toBe("/en");
    expect(localeEntryPath("/ru")).toBe("/ru");
    expect(localeEntryPath("https://intgetion.com/en/jobs")).toBeNull();
    expect(localeEntryPath("https://evil.example/en")).toBe("/en");
    expect(localeEntryPath("not a url")).toBeNull();
  });

  it("moves in the browser and appends the fragment the server never saw", () => {
    const html = hashPreservingEntryHtml("/en", "abc+/= ");
    expect(html).toContain('nonce="abc+/= "');
    expect(html).toContain('location.replace("/en"+location.hash)');
    expect(html).toContain('href="/en"');
    expect(html).not.toContain("http-equiv");
  });
});
