import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText } from "./rich-text";

const render = (text: string) =>
  renderToStaticMarkup(createElement(RichText, { text }));

describe("RichText (D591)", () => {
  it("renders headings one level down, lists and paragraphs", () => {
    const html = render("# Role\n\nIntro\n\n## Do\n\n- One\n- Two");
    expect(html).toContain("<h3");
    expect(html).not.toMatch(/<h[12][\s>]/);
    expect(html).toContain("<ul");
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain("<p");
  });

  it("structures an old flat description", () => {
    const html = render("Requirements:\n• Go\n• SQL\nWe pay well.");
    expect(html).toMatch(/<h3[^>]*>Requirements<\/h3>/);
    expect(html.match(/<li/g)).toHaveLength(2);
  });

  it("drops raw HTML, scripts, images and unsafe links", () => {
    const html = render(
      '<script>alert(1)</script><b onclick="x()">hi</b>\n\n' +
        "![x](https://t.dev/p.gif) [bad](javascript:alert(1)) [ok](https://a.dev)",
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).toContain(
      '<a href="https://a.dev/" target="_blank" rel="nofollow ugc noopener noreferrer"',
    );
  });

  it("renders nothing for empty text", () => {
    expect(render("  ")).toBe("");
  });
});
