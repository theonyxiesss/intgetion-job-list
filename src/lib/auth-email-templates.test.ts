import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTH_TEMPLATE_KINDS,
  authTemplateHtml,
  authTemplateSubject,
} from "./auth-email-templates";

const dir = join(process.cwd(), "supabase", "templates");
const lf = (value: string) => value.replaceAll("\r\n", "\n");
const config = lf(
  readFileSync(join(process.cwd(), "supabase", "config.toml"), "utf8"),
);

describe("Supabase auth email templates (D330)", () => {
  for (const kind of AUTH_TEMPLATE_KINDS) {
    it(`${kind}: the committed file matches the layout`, () => {
      const html = authTemplateHtml(kind);
      const file = join(dir, `${kind}.html`);
      if (process.env.UPDATE_EMAIL_TEMPLATES) writeFileSync(file, html);
      expect(lf(readFileSync(file, "utf8"))).toBe(html);
    });

    it(`${kind}: keeps the Supabase link unescaped in button and fallback`, () => {
      const html = authTemplateHtml(kind);
      // Four languages × (button + fallback text + fallback href) (D350).
      expect(html.match(/\{\{ \.ConfirmationURL \}\}/g)).toHaveLength(12);
      expect(html).toContain('src="{{ .SiteURL }}/email/logo.png"');
      expect(
        html.startsWith('{{ if eq (printf "%v" .Data.locale) "ru" }}'),
      ).toBe(true);
      expect(html.trimEnd().endsWith("{{ end }}")).toBe(true);
    });

    it(`${kind}: is wired in config.toml with the generated subject`, () => {
      const section = `[auth.email.template.${kind}]`;
      expect(config).toContain(section);
      const block = config.slice(config.indexOf(section)).split("\n\n")[0]!;
      expect(block).toContain(
        `content_path = "./supabase/templates/${kind}.html"`,
      );
      expect(block).toContain(`subject = '${authTemplateSubject(kind)}'`);
    });
  }

  it("password reset says it was requested and how to ignore it", () => {
    const html = authTemplateHtml("recovery");
    expect(html).toContain("Вы запросили сброс пароля");
    expect(html).toContain("Сбросить пароль");
    expect(html).toContain("You requested a password reset");
    expect(html).toContain(
      "If you did not request a reset, ignore this email.",
    );
  });
});
