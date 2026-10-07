import { describe, expect, it } from "vitest";
import { siteEmailHtml } from "./email-html";

describe("site email shell", () => {
  it("uses the dark site shell and escapes the body", () => {
    const html = siteEmailHtml({
      preheader: "Hidden preview",
      headline: "Confirm <you>",
      body: 'Hello <Acme> & "co"',
      action: {
        href: "https://intgetion.com/en/verify?a=1&b=2",
        label: "Confirm",
      },
      footer: {
        href: "https://intgetion.com/en/unsubscribe",
        label: "Unsubscribe",
      },
    });
    expect(html).toContain("INTGETION JOB LIST");
    expect(html).toContain("background:#000000");
    expect(html).toContain("background:#0b0b0c");
    expect(html).toContain("Hidden preview");
    expect(html).toContain("Confirm &lt;you&gt;");
    expect(html).toContain("Hello &lt;Acme&gt; &amp; &quot;co&quot;");
    expect(html).toContain("https://intgetion.com/en/verify?a=1&amp;b=2");
    expect(html).not.toContain("<Acme>");
  });
});
