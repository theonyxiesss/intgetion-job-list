import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  htmlToMarkdown,
  markdownToPlain,
  safeExternalHref,
  toMarkdown,
} from "./rich-text";

describe("htmlToMarkdown (D591)", () => {
  it("keeps headings, paragraphs, nested and ordered lists", () => {
    expect(
      htmlToMarkdown(
        "<h1>Role</h1><div>Line one<br/>Line two</div>" +
          "<ol><li>First<ul><li>Inner</li></ul></li><li>Second</li></ol>" +
          "<h5>Small</h5><p>End</p>",
      ),
    ).toBe(
      "### Role\n\nLine one\nLine two\n\n1. First\n  - Inner\n2. Second\n\n#### Small\n\nEnd",
    );
  });

  it("drops scripts, styles, comments, frames and images", () => {
    const out = htmlToMarkdown(
      '<style>p{}</style><!-- note --><p>Hi<img src="x.png" alt="logo"></p>' +
        "<script>alert(1)</script><iframe>frame</iframe><noscript>no</noscript>",
    );
    expect(out).toBe("Hi");
  });

  it("keeps only http(s) links and trims spaces around bold", () => {
    expect(
      htmlToMarkdown(
        '<p><strong> Pay: </strong>good. <a href="data:text/html,x">x</a> ' +
          "<a href='https://a.dev/p (1)'>see</a></p>",
      ),
    ).toBe("**Pay:** good. x [see](https://a.dev/p%20%281%29)");
  });

  it("escapes characters that would become Markdown", () => {
    expect(htmlToMarkdown("<p># not a heading *x* [y]</p>")).toBe(
      "\\# not a heading \\*x\\* \\[y\\]",
    );
  });

  it("decodes entities, including numeric ones", () => {
    expect(decodeEntities("a&nbsp;&amp;&#8211;&#x2014;&rsquo;&bogus;")).toBe(
      "a &–—’&bogus;",
    );
  });

  it("cuts long text at a line break", () => {
    const html = Array.from(
      { length: 400 },
      (_, i) => `<p>Para ${i} ${"x".repeat(30)}</p>`,
    ).join("");
    const out = htmlToMarkdown(html);
    expect(out.length).toBeLessThanOrEqual(8000);
    expect(out.endsWith("x")).toBe(true);
  });
});

describe("toMarkdown (D591)", () => {
  it("turns flat lines into paragraphs, lists and headings", () => {
    expect(
      toMarkdown(
        "We build tools.\nResponsibilities:\n• Ship APIs\n· Review code\n- Mentor\n1. Plan\n2) Do\nRequirements: 5 years of Go.\nSalary: 100 – 150 USD / year",
      ),
    ).toBe(
      "We build tools.\n\n### Responsibilities\n\n- Ship APIs\n- Review code\n- Mentor\n1. Plan\n2. Do\n\n### Requirements\n\n5 years of Go.\n\nSalary: 100 – 150 USD / year",
    );
  });

  it("puts structure back into an old one-line import", () => {
    expect(
      toMarkdown(
        "Join us. Responsibilities: • Build APIs • Ship features What we offer: Remote work. Location: Europe",
      ),
    ).toBe(
      "Join us.\n\n### Responsibilities\n\n- Build APIs\n- Ship features\n\n### What we offer\n\nRemote work.\n\nLocation: Europe",
    );
  });

  it("splits a very long paragraph at sentence ends", () => {
    const sentence = "This sentence is about forty characters. ";
    const out = toMarkdown(sentence.repeat(30).trim());
    expect(out.split("\n\n").length).toBeGreaterThan(2);
    expect(out).not.toContain("\n\n\n");
  });

  it("leaves Markdown as it is", () => {
    const markdown =
      "### About\n\nWe **build** [tools](https://x.dev).\n\n- One\n  - Two\n- Three\n\n```\ncode:\n• not a list\n```";
    expect(toMarkdown(markdown)).toBe(markdown);
    expect(toMarkdown(toMarkdown(markdown))).toBe(markdown);
  });

  it("treats short all-caps lines as headings, not every short line", () => {
    expect(toMarkdown("WHAT WE OFFER\nGood pay\nFlexible hours")).toBe(
      "### WHAT WE OFFER\n\nGood pay\n\nFlexible hours",
    );
  });

  it("is empty for empty input", () => {
    expect(toMarkdown(null)).toBe("");
    expect(toMarkdown("  \n ")).toBe("");
  });
});

describe("markdownToPlain (D591)", () => {
  it("removes marks for a card summary", () => {
    expect(
      markdownToPlain(
        "### About\n\nWe **build** [tools](https://x.dev) for my_var.\n\n- One\n2. Two \\<3",
      ),
    ).toBe("About We build tools for my_var. One Two <3");
  });
});

describe("safeExternalHref", () => {
  it("allows http and https only", () => {
    expect(safeExternalHref("https://a.dev/x")).toBe("https://a.dev/x");
    expect(safeExternalHref("http://a.dev")).toBe("http://a.dev/");
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("/jobs/1")).toBeNull();
    expect(safeExternalHref(undefined)).toBeNull();
  });
});
