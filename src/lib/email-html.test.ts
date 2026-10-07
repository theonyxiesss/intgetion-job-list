import { describe, expect, it } from "vitest";
import { raw, renderEmailLayout, siteEmailHtml } from "./email-html";

const origin = "https://intgetion.com";

describe("email layout (D330)", () => {
  it("escapes text and links, keeps the brand and the logo image", () => {
    const html = siteEmailHtml({
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
    expect(html).toMatch(
      /<img src="[^"]+\/email\/logo\.png" width="32" height="32"/,
    );
    expect(html).toContain("Hello &lt;Acme&gt; &amp; &quot;co&quot;");
    expect(html).toContain("https://intgetion.com/en/verify?a=1&amp;b=2");
    expect(html).toContain("https://intgetion.com/en/unsubscribe");
    expect(html).not.toContain("<Acme>");
  });

  it("uses only email-safe layout: tables, a 560px column, no modern CSS", () => {
    const html = renderEmailLayout({
      lang: "en",
      origin,
      title: "Confirm your email",
      body: "One.\n\nTwo.",
      action: { href: `${origin}/x`, label: "Confirm email" },
      fallbackLabel: "Copy this link:",
      notes: ["Ignore otherwise."],
      footer: { reason: "Because." },
    });
    expect(html).toContain("max-width:560px");
    expect(html).toContain(
      '<!--[if mso]><table role="presentation" width="560"',
    );
    expect(html).not.toMatch(
      /display:\s*(flex|grid)|position:\s*(absolute|fixed)/,
    );
    // Bulletproof button: the cell is painted for Outlook.
    expect(html).toContain('bgcolor="#000000"');
    // Two paragraphs, fallback link breaks anywhere instead of overflowing.
    expect(html.match(/<p style="margin:0 0 16px/g)).toHaveLength(2);
    expect(html).toContain("word-break:break-all");
    expect(html).toContain('<h1 style="margin:0 0 16px');
    // Nothing smaller than 12px.
    const sizes = [...html.matchAll(/font-size:(\d+)px/g)].map((m) =>
      Number(m[1]),
    );
    expect(
      Math.min(...sizes.filter((size) => size > 1)),
    ).toBeGreaterThanOrEqual(12);
  });

  it("passes raw template values through untouched", () => {
    const html = renderEmailLayout({
      lang: "ru",
      origin: "{{ .SiteURL }}",
      action: { href: raw("{{ .ConfirmationURL }}"), label: "Войти" },
      fallbackLabel: "Ссылка:",
    });
    expect(html).toContain('href="{{ .ConfirmationURL }}"');
    expect(html).toContain('src="{{ .SiteURL }}/email/logo.png"');
    expect(html).toContain('<html lang="ru"');
  });

  it("renders job cards that wrap long titles and company names", () => {
    const long =
      "Senior Staff Principal Distinguished Platform Infrastructure Engineer".repeat(
        3,
      );
    const html = renderEmailLayout({
      lang: "en",
      origin,
      jobs: [
        {
          title: long,
          company: "Acme <Corp>",
          location: "Berlin, DE",
          workFormat: "Remote",
          salary: "€60,000 – €80,000 / year",
          summary: "Build things.",
          href: `${origin}/en/jobs/1`,
        },
      ],
      jobAction: "View job",
      moreAction: { href: `${origin}/en/matches`, label: "View all jobs" },
    });
    expect(html).toContain(long);
    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).toContain("Acme &lt;Corp&gt; · Berlin, DE");
    expect(html).toContain("Remote · €60,000 – €80,000 / year");
    expect(html).toContain(">View job</a>");
    expect(html).toContain(">View all jobs</a>");
  });
});
