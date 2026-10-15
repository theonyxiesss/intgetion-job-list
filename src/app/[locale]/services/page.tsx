import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BriefForm, type BriefFormCopy } from "@/components/company/brief-form";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/paths";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

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
              <BriefForm copy={form} />
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
