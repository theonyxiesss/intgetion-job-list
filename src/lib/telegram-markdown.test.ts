import { describe, expect, it } from "vitest";
import { markdownToTelegramHtml, stripMarkdown } from "./telegram-markdown";

describe("Spoki Markdown in Telegram (D514)", () => {
  it("turns bold, italics, code, headings and bullets into Telegram HTML", () => {
    expect(
      markdownToTelegramHtml(
        "## План\n**Продукт:** LUMINA\n- до/после\n* *честно*\nи `код`",
      ),
    ).toBe(
      "<b>План</b>\n<b>Продукт:</b> LUMINA\n• до/после\n• <i>честно</i>\nи <code>код</code>",
    );
  });

  it("escapes text and keeps only https links", () => {
    expect(markdownToTelegramHtml("a < b & c > d")).toBe(
      "a &lt; b &amp; c &gt; d",
    );
    expect(
      markdownToTelegramHtml(
        "[site](https://intgetion.com/jobs?a=1&b=2) [x](javascript:alert(1))",
      ),
    ).toBe('<a href="https://intgetion.com/jobs?a=1&amp;b=2">site</a> x');
    expect(markdownToTelegramHtml("<b onclick=x>hi</b>")).toBe(
      "&lt;b onclick=x&gt;hi&lt;/b&gt;",
    );
  });

  it("keeps code blocks as preformatted text", () => {
    expect(markdownToTelegramHtml("```js\nif (a < b) **x**\n```")).toBe(
      "<pre>if (a &lt; b) **x**</pre>",
    );
  });

  it("gives plain words when markup is refused", () => {
    expect(stripMarkdown("**Продукт:** [сайт](https://a.test) `x`")).toBe(
      "Продукт: сайт x",
    );
  });
});
