import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const widths = [360, 390] as const;

async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

/** Buttons, fields and the tab bar. Inline text links in a sentence stay small (D286). */
async function tapTargets(page: Page) {
  const small = await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll(
        "button, input, textarea, select, [data-bottom-nav] a",
      ),
    ];
    return nodes.flatMap((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (style.visibility === "hidden" || box.width === 0 || box.height === 0)
        return [];
      if (box.width >= 44 && box.height >= 44) return [];
      const name =
        node.getAttribute("aria-label") ||
        node.textContent?.trim().slice(0, 40) ||
        node.tagName;
      return [`${name} ${Math.round(box.width)}x${Math.round(box.height)}`];
    });
  });
  expect(small).toEqual([]);
}

async function axeClean(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  expect(bad.map((violation) => `${violation.impact}:${violation.id}`)).toEqual(
    [],
  );
}

test("phone pages do not scroll sideways and controls are at least 44px", async ({
  page,
}) => {
  test.setTimeout(180_000);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/en");
    await noHorizontalScroll(page);
    await tapTargets(page);
    await axeClean(page);

    await page.goto("/en/jobs");
    await noHorizontalScroll(page);
    await tapTargets(page);
    await axeClean(page);
    const href = await page
      .locator('a[href*="/jobs/"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute("href") ?? "")
          .find((value) => /\/jobs\/[0-9a-f-]{36}/.test(value)),
      );
    expect(href).toBeTruthy();
    await page.goto(href!);
    await noHorizontalScroll(page);
    await tapTargets(page);
    await axeClean(page);

    await page.goto("/en/salaries");
    await noHorizontalScroll(page);
    await tapTargets(page);
    await axeClean(page);

    await page.goto("/en/login");
    await noHorizontalScroll(page);
    await tapTargets(page);
    await axeClean(page);

    await page.goto("/en/chat");
    await noHorizontalScroll(page);
    await tapTargets(page);
    await axeClean(page);
    const shell = page.locator(".chat-shell");
    const shellBox = await shell.boundingBox();
    expect(shellBox?.height ?? 0).toBeGreaterThan(800 * 0.7);
    const field = page.getByLabel("Write a message");
    await field.focus();
    const fieldBox = await field.boundingBox();
    expect((fieldBox?.y ?? 0) + (fieldBox?.height ?? 0)).toBeLessThanOrEqual(
      800,
    );
  }
});
