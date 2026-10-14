import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/paths";
import en from "@/messages/en.json";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

type PortfolioBody = (typeof en.portfolioPage)["body"];
type Domain = PortfolioBody["profile"]["domains"][number];
type Skill = { name: string; text: string };

function TextLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function SkillList({ items }: { items: Skill[] }) {
  return (
    <div>
      {items.map((item) => (
        <div key={item.name} className="border-t border-line py-5">
          <h4 className="font-medium">{item.name}</h4>
          <p className="mt-2 max-w-[65ch] text-fg-muted">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function domainItems(domain: Domain): Skill[] | undefined {
  return "items" in domain ? domain.items : undefined;
}

function domainGroups(
  domain: Domain,
): { title: string; items: Skill[] }[] | undefined {
  return "groups" in domain ? domain.groups : undefined;
}

function domainNote(domain: Domain): string | undefined {
  return "note" in domain ? domain.note : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portfolioPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/portfolio`,
      languages: languageAlternates("/portfolio"),
    },
  };
}

/** Portfolio, moved onto this platform (D400). */
export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portfolioPage");
  const page = t.raw("body") as PortfolioBody;

  return (
    <main id="top">
      <Section>
        <Container className="flex flex-col gap-6">
          <nav
            aria-label={page.heroTitle}
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {page.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="t-label text-fg-muted hover:text-fg"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <p className="t-label text-fg-muted">{page.heroEyebrow}</p>
          <h1 className="t-display-l">{page.heroTitle}</h1>
          <p className="t-body-l max-w-[60ch] text-fg-muted">
            {page.heroSubtitle}
          </p>
          <p className="max-w-[55ch] text-fg-muted">{page.heroValue}</p>
          <div className="flex flex-wrap gap-3">
            <a href="#social" className={buttonClass("primary", "lg")}>
              {page.cta}
            </a>
            <a href="#profile" className={buttonClass("secondary", "lg")}>
              {page.ctaSecondary}
            </a>
          </div>
        </Container>
      </Section>

      <Section bordered labelledBy="social-title">
        <div id="social" className="scroll-mt-24">
          <Container className="flex flex-col gap-10">
            <div className="flex items-end justify-between gap-4">
              <h2 id="social-title" className="t-h2">
                {page.social.title}
              </h2>
              <p className="t-data text-fg-muted">{page.social.index}</p>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="t-h3">{page.social.channelsLabel}</h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {page.social.channels.map((channel) => (
                  <li key={channel.href}>
                    <TextLink
                      href={channel.href}
                      className="flex flex-col border border-line p-4 hover:border-line-strong"
                    >
                      <span className="font-medium">{channel.label}</span>
                      <span className="mt-1 text-sm text-fg-muted">
                        {channel.hint}
                      </span>
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="flex flex-col border-t border-line">
              {page.social.links.map((link) => (
                <li key={link.name} className="border-b border-line">
                  <TextLink
                    href={link.href}
                    className="flex flex-col py-5 hover:text-fg"
                  >
                    <span className="t-h3">{link.name}</span>
                    <span className="mt-1 text-sm text-fg-muted">
                      {link.handle}
                    </span>
                  </TextLink>
                </li>
              ))}
            </ul>
          </Container>
        </div>
      </Section>

      <Section labelledBy="services-title">
        <div id="services" className="scroll-mt-24">
          <Container className="flex flex-col gap-8">
            <div className="flex items-end justify-between gap-4">
              <h2 id="services-title" className="t-h2">
                {page.services.title}
              </h2>
              <p className="t-data text-fg-muted">{page.services.index}</p>
            </div>
            <p className="max-w-[60ch] text-fg-muted">{page.services.lead}</p>
            <ul className="grid gap-4 md:grid-cols-2">
              {page.services.items.map((item) => (
                <li key={item.id} className="border border-line p-5">
                  <p className="t-data text-fg-muted">{item.id}</p>
                  <h3 className="t-h3 mt-3">{item.title}</h3>
                  <p className="mt-2 text-fg-muted">{item.text}</p>
                </li>
              ))}
            </ul>
          </Container>
        </div>
      </Section>

      <Section bordered labelledBy="capabilities-title">
        <div id="capabilities" className="scroll-mt-24">
          <Container className="flex flex-col gap-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-4">
                <h2 id="capabilities-title" className="t-h2">
                  {page.capabilities.title}
                </h2>
                <p className="t-data text-fg-muted">
                  {page.capabilities.index}
                </p>
              </div>
              <p className="max-w-[60ch] text-fg-muted">
                {page.capabilities.lead}
              </p>
            </div>
            <ul className="grid gap-4 lg:grid-cols-3">
              {page.capabilities.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 border border-line p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="t-data text-fg-muted">{item.id}</p>
                    <p className="t-label text-fg-muted">{item.status}</p>
                  </div>
                  <h3 className="t-h3">{item.title}</h3>
                  <p className="text-fg-muted">{item.text}</p>
                  <dl className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
                    <div>
                      <dt className="t-label text-fg-muted">
                        {page.capabilities.stackLabel}
                      </dt>
                      <dd className="mt-1 text-sm text-fg-muted">
                        {item.stack}
                      </dd>
                    </div>
                    <div>
                      <dt className="t-label text-fg-muted">
                        {page.capabilities.outcomeLabel}
                      </dt>
                      <dd className="mt-1 text-sm text-fg-muted">
                        {item.outcome}
                      </dd>
                    </div>
                    <div>
                      <dt className="t-label text-fg-muted">
                        {page.capabilities.roleLabel}
                      </dt>
                      <dd className="mt-1 text-sm text-fg-muted">
                        {item.role}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-6 border-t border-line pt-10">
              <h3 className="t-h3">{page.capabilities.technologies}</h3>
              <p className="max-w-[60ch] text-fg-muted">
                {page.capabilities.stackLead}
              </p>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {page.capabilities.categories.map((category) => (
                  <li key={category.id} className="border border-line p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="t-data text-fg-muted">{category.id}</p>
                        <h4 className="mt-2 font-medium">{category.title}</h4>
                      </div>
                      <p className="t-label text-fg-muted">{category.status}</p>
                    </div>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {category.items.map((skill) => (
                        <li
                          key={skill}
                          className="border border-line px-2 py-1 text-sm text-fg-muted"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-line p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="t-h3">{page.capabilities.exploring}</h3>
                <p className="t-label text-fg-muted">
                  {page.capabilities.exploringStatus}
                </p>
              </div>
              <p className="mt-3 max-w-[60ch] text-fg-muted">
                {page.capabilities.exploringLead}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {page.capabilities.exploringItems.map((item) => (
                  <li
                    key={item}
                    className="border border-line px-2 py-1 text-sm text-fg-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6 border-t border-line pt-10">
              <h3 className="t-h3">{page.capabilities.whatIBuild}</h3>
              <p className="max-w-[60ch] text-fg-muted">
                {page.capabilities.whatIBuildLead}
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {page.capabilities.builds.map((item) => (
                  <li key={item.title} className="border border-line p-5">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="mt-2 text-fg-muted">{item.text}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6 border-t border-line pt-10">
              <h3 className="t-h3">{page.capabilities.casesTitle}</h3>
              <p className="max-w-[65ch] text-fg-muted">
                {page.capabilities.casesLead}
              </p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {page.capabilities.cases.map((item) => (
                  <li key={item.title} className="border border-line p-5">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="mt-2 text-fg-muted">{item.text}</p>
                    <ul className="mt-4 flex flex-wrap gap-3">
                      {item.links.map((link) => (
                        <li key={link.href}>
                          <TextLink
                            href={link.href}
                            className="underline-offset-4 hover:underline"
                          >
                            {link.name}
                          </TextLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </div>
      </Section>

      <Section labelledBy="about-title">
        <div id="about" className="scroll-mt-24">
          <Container className="flex flex-col gap-10">
            <div className="flex items-end justify-between gap-4">
              <h2 id="about-title" className="t-h2">
                {page.about.title}
              </h2>
              <p className="t-data text-fg-muted">{page.about.index}</p>
            </div>
            <p className="max-w-[40ch] text-2xl leading-snug text-fg-muted md:text-3xl">
              {page.about.statement}
            </p>
            <dl className="grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
              <div>
                <dt className="t-label text-fg-muted">
                  {page.about.basedInLabel}
                </dt>
                <dd className="mt-2">{page.about.basedIn}</dd>
              </div>
              <div>
                <dt className="t-label text-fg-muted">
                  {page.about.focusLabel}
                </dt>
                <dd className="mt-2">{page.about.focus}</dd>
              </div>
              <div>
                <dt className="t-label text-fg-muted">
                  {page.about.currentlyLabel}
                </dt>
                <dd className="mt-2">{page.about.currently}</dd>
              </div>
            </dl>
          </Container>
        </div>
      </Section>

      <Section bordered labelledBy="profile-title">
        <div id="profile" className="scroll-mt-24">
          <Container className="flex flex-col gap-12">
            <div className="flex items-end justify-between gap-4">
              <h2 id="profile-title" className="t-h2">
                {page.profile.title}
              </h2>
              <p className="t-data text-fg-muted">{page.profile.index}</p>
            </div>
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <p className="t-label text-fg-muted">
                  {page.profile.coreFocus}
                </p>
                <p className="t-label mt-4 text-fg-muted">
                  {page.profile.rolesLabel}
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {page.profile.roles.map((role) => (
                    <li key={role} className="t-h3">
                      {role}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
                <p className="t-label text-fg-muted">
                  {page.profile.goalLabel}
                </p>
                <p className="mt-4 text-xl leading-snug text-fg-muted">
                  {page.profile.goal}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-16">
              {page.profile.domains.map((domain) => {
                const note = domainNote(domain);
                const items = domainItems(domain);
                const groups = domainGroups(domain);
                return (
                  <article
                    key={domain.id}
                    className="border-t border-line pt-10"
                  >
                    <p className="t-data text-fg-muted">{domain.id}</p>
                    <h3 className="t-h2 mt-3">{domain.title}</h3>
                    <p className="t-label mt-2 text-fg-muted">
                      {domain.subtitle}
                    </p>
                    {note ? (
                      <p className="mt-6 max-w-[65ch] border-l border-line pl-4 text-fg-muted">
                        {note}
                      </p>
                    ) : null}
                    {items ? (
                      <div className="mt-6">
                        <SkillList items={items} />
                      </div>
                    ) : null}
                    {groups ? (
                      <div className="mt-8 flex flex-col gap-10">
                        {groups.map((group) => (
                          <div key={group.title}>
                            <h4 className="border-b border-line pb-3 font-medium">
                              {group.title}
                            </h4>
                            <SkillList items={group.items} />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <div className="border-t border-line pt-8">
              <p className="max-w-[40ch] text-fg-muted">{page.footerBlurb}</p>
              <p className="t-label mt-4 text-fg-muted">{page.copyright}</p>
            </div>
          </Container>
        </div>
      </Section>
    </main>
  );
}
