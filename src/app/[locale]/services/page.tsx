import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BriefForm, type BriefFormCopy } from "@/components/company/brief-form";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/paths";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { flags } from "@/config/flags";

/** Order a managed team. Copy follows the locale. The company story stays English (D404, D417). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/services`,
      languages: languageAlternates("/services"),
    },
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const groups = t.raw("groups") as { name: string; items: string[] }[];
  const form = t.raw("form") as BriefFormCopy;
  const links = t.raw("links") as { label: string; href: string }[];

  // v2 (UI_V2): mockup layout on the same copy and the same brief form.
  if (flags.uiV2Enabled) {
    return (
      <main className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
          <header className="flex flex-wrap items-end gap-6">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3">
              <p className="text-[13px] font-semibold tracking-[0.04em] text-accent uppercase">
                {t("workspace")}
              </p>
              <h1 className="max-w-[22ch] text-[34px] leading-tight font-semibold tracking-tight">
                {t("title")}
              </h1>
              <p className="max-w-[64ch] text-[15px] leading-relaxed text-fg-muted">
                {t("lead")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="#brief"
                className="flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg"
              >
                {form.title}
              </a>
              <Link
                href={{ pathname: "/chat", query: { from: "services" } }}
                className="flex min-h-11 items-center rounded-xl border border-line-strong px-4 text-sm text-accent"
              >
                {t("chat")}
              </Link>
            </div>
          </header>

          <div className="flex flex-wrap items-start gap-5">
            <section
              aria-labelledby="services-list"
              className="flex min-w-0 flex-[999_1_560px] flex-col gap-3"
            >
              <h2 id="services-list" className="text-lg font-semibold">
                {t("listTitle")}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <li
                    key={group.name}
                    className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4"
                  >
                    <span className="text-base font-semibold">
                      {group.name}
                    </span>
                    <ul className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="rounded-lg bg-surface-2 px-2.5 py-1 text-[13px] text-fg-muted"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-fg-muted">{t("else")}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/company"
                  className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm"
                >
                  {t("about")}
                </Link>
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-10 items-center rounded-xl border border-line-strong px-3.5 text-sm"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
            <aside
              id="brief"
              aria-label={t("listTitle")}
              className="min-w-0 flex-[1_1_340px] rounded-[18px] border border-line bg-surface p-5 lg:sticky lg:top-6 lg:max-w-[420px]"
            >
              <BriefForm
                copy={form}
                directionGroups={groups.map((group) => group.name)}
              />
            </aside>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Section labelledBy="services-title">
        <Container narrow className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 id="services-title" className="t-display-l max-w-[16ch]">
              {t("title")}
            </h1>
            <p className="t-body-l text-fg-muted">{t("lead")}</p>
            <Link
              href={{ pathname: "/chat", query: { from: "services" } }}
              className={buttonClass(
                "secondary",
                "md",
                "self-start max-w-full text-center",
              )}
            >
              {t("chat")}
            </Link>
          </div>
          <div className="border border-line bg-surface">
            <div className="border-b border-line px-4 py-4 md:px-6">
              <p className="t-label text-fg-muted">{t("workspace")}</p>
              <h2 className="t-h3 mt-2">{t("listTitle")}</h2>
            </div>
            <dl className="px-4 md:px-6">
              {groups.map((group) => (
                <div
                  key={group.name}
                  className="grid gap-2 border-b border-line py-4 sm:grid-cols-[11rem_1fr] sm:items-baseline"
                >
                  <dt className="t-label text-fg-muted">{group.name}</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="border border-line bg-bg px-3 py-2"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="px-4 py-4 text-fg-muted md:px-6">{t("else")}</p>
            <div className="border-t border-line px-4 py-6 md:px-6">
              <BriefForm
                copy={form}
                directionGroups={groups.map((group) => group.name)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/company" className={buttonClass("secondary", "md")}>
              {t("about")}
            </Link>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "md")}
              >
                {link.label}
              </a>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  );
}
