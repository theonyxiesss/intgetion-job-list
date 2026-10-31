import { NextIntlClientProvider } from "next-intl";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: Record<string, unknown>) => createElement("a", props),
}));

const { ChatMarkdown, closeOpenMarks, nextRevealLength, safeHref } =
  await import("./chat-markdown");
const { draftCardDue } = await import("./draft-card");

function html(text: string): string {
  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: "en", messages: en } as unknown as ComponentProps<
        typeof NextIntlClientProvider
      >,
      createElement(ChatMarkdown, { text }),
    ),
  );
}

describe("Spoki answers as Markdown (D514)", () => {
  it("renders bold, lists, tables and code", () => {
    const out = html(
      "**Продукт:** LUMINA\n\n- до/после\n- распаковка\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```\nnpm i\n```\n\nи `код`",
    );
    expect(out).toContain('<strong class="font-semibold">Продукт:</strong>');
    expect(out).toContain("<li>до/после</li>");
    expect(out).toContain("<table");
    expect(out).toContain("<td");
    expect(out).toContain("npm i");
    expect(out).toContain("Copy code");
    expect(out).toContain("font-mono");
  });

  it("drops raw HTML, scripts and images from the model's text", () => {
    const out = html(
      'Hi <script>alert(1)</script><img src="https://x.test/p.png" onerror="x"> ![tracker](https://x.test/t.png)',
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("tracker");
  });

  it("keeps only https and site links; outside links open safely", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("http://example.com")).toBeNull();
    expect(safeHref("//evil.test/x")).toBeNull();
    expect(safeHref("/jobs/1")).toBe("/jobs/1");
    const out = html(
      "[bad](javascript:alert(1)) [site](https://example.com/a)",
    );
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="https://example.com/a"');
    expect(out).toContain('rel="noopener noreferrer nofollow ugc"');
    expect(out).toContain('target="_blank"');
  });

  it("closes marks a half-typed answer stopped inside", () => {
    expect(closeOpenMarks("**Прод")).toBe("**Прод**");
    expect(closeOpenMarks("и `ко")).toBe("и `ко`");
    expect(closeOpenMarks("```\nnpm")).toBe("```\nnpm\n```");
    expect(closeOpenMarks("**done** text")).toBe("**done** text");
  });

  it("types at a steady pace: at least 80 characters a second, any answer within 1.2 s", () => {
    expect(nextRevealLength(0, 1000, 16)).toBe(13);
    expect(nextRevealLength(0, 10, 16)).toBe(1);
    expect(nextRevealLength(5, 10, 1000)).toBe(10);
    expect(nextRevealLength(10, 10, 16)).toBe(10);
    let shown = 0;
    for (let ms = 0; ms < 1216; ms += 16)
      shown = nextRevealLength(shown, 3000, 16);
    expect(shown).toBe(3000);
  });

  it("shows the draft card with the form link only when complete or asked", () => {
    expect(draftCardDue(["deadline"], false)).toBe(false);
    expect(draftCardDue(["deadline"], undefined)).toBe(false);
    expect(draftCardDue(["deadline"], true)).toBe(true);
    expect(draftCardDue([], false)).toBe(true);
    expect(draftCardDue(undefined, false)).toBe(false);
  });
});

describe("a typing answer fades its newest word in (D588)", () => {
  const live = async (text: string) => {
    const { LiveMarkdown } = await import("./chat-markdown");
    return renderToStaticMarkup(createElement(LiveMarkdown, { text }));
  };

  it("wraps only the last word", async () => {
    const out = await live("Нашёл пять вакансий");
    expect(out).toContain('<span class="spoki-word">вакансий</span>');
    expect(out).toContain("Нашёл пять ");
  });

  it("finds the last word inside bold and lists", async () => {
    expect(await live("Это **важно**")).toContain(
      '<strong class="font-semibold"><span class="spoki-word">важно</span></strong>',
    );
    expect(await live("- один\n- два")).toContain(
      '<span class="spoki-word">два</span>',
    );
  });
});
