import type { ReactNode } from "react";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/paths";
import en from "@/messages/en.json";
import { JsonLd } from "@/modules/seo/json-ld";
import { faqPageJsonLd } from "@/modules/seo/markup";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

const company = en.companyMarketing;

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: company.metaTitle,
    description: company.metaDescription,
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/company`,
      languages: languageAlternates("/company"),
    },
  };
}

/** Company story, English only, on every locale (D400, D404). */
export default async function CompanySitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = company.body;
  const faq = page.faq.items.map((item) => ({
    question: item.q,
    answer: item.a,
  }));

  return (
    <main>
      <JsonLd data={faqPageJsonLd(faq)} />
      <Section>
        <Container className="flex flex-col gap-6">
          <nav
            aria-label={page.brand}
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
          <p className="t-label text-fg-muted">{page.brand}</p>
          <h1 className="t-display-l max-w-[18ch]">{page.heroTitle}</h1>
          <p className="t-body-l max-w-[60ch] text-fg-muted">{page.heroText}</p>
          <div className="flex flex-wrap gap-3">
            <a href="#solutions" className={buttonClass("primary", "lg")}>
              {page.explore}
            </a>
            <a href="#contact" className={buttonClass("secondary", "lg")}>
              {page.start}
            </a>
          </div>
        </Container>
      </Section>

      <Section bordered labelledBy="problem-title">
        <Container className="flex flex-col gap-8">
          <p className="t-label text-fg-muted">{page.problem.kicker}</p>
          <h2 id="problem-title" className="t-h2 max-w-[20ch]">
            {page.problem.title}
          </h2>
          <p className="t-body-l max-w-[60ch] text-fg-muted">
            {page.problem.text}
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {page.problem.items.map((item) => (
              <li key={item.title} className="border border-line p-5">
                <h3 className="t-h3">{item.title}</h3>
                <p className="mt-2 text-fg-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section labelledBy="services-title">
        <div id="services" className="scroll-mt-24">
          <Container className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <p className="t-label text-fg-muted">{page.services.kicker}</p>
              <h2 id="services-title" className="t-h2 max-w-[20ch]">
                {page.services.title}
              </h2>
              <p className="max-w-[65ch] text-fg-muted">{page.services.lead}</p>
            </div>
            <div className="flex flex-col gap-12">
              {page.services.groups.map((group) => (
                <section key={group.num} className="border-t border-line pt-8">
                  <p className="t-data text-fg-muted">{group.num}</p>
                  <h3 className="t-h3 mt-2">{group.name}</h3>
                  <p className="t-label mt-2 text-fg-muted">{group.meta}</p>
                  <div className="mt-6 flex flex-col gap-8">
                    {group.blocks.map((block) => (
                      <div key={block.title} className="max-w-[65ch]">
                        <h4 className="font-medium">{block.title}</h4>
                        <p className="mt-2 text-fg-muted">{block.text}</p>
                        {"caps" in block && block.caps ? (
                          <ul className="mt-4 flex flex-wrap gap-2">
                            {block.caps.map((cap) => (
                              <li
                                key={cap}
                                className="border border-line px-3 py-2 text-sm"
                              >
                                {cap}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Container>
        </div>
      </Section>

      <Section bordered labelledBy="approach-title">
        <div id="approach" className="scroll-mt-24">
          <Container className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <p className="t-label text-fg-muted">{page.approach.kicker}</p>
              <h2 id="approach-title" className="t-h2 max-w-[18ch]">
                {page.approach.title}
              </h2>
              <p className="max-w-[60ch] text-fg-muted">{page.approach.lead}</p>
            </div>
            <ol className="grid gap-8 md:grid-cols-2">
              {page.approach.steps.map((step) => (
                <li key={step.num}>
                  <p className="t-data text-fg-muted">{step.num}</p>
                  <h3 className="t-h3 mt-3">{step.title}</h3>
                  <p className="mt-2 text-fg-muted">{step.text}</p>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-6 border-t border-line pt-8">
              <h3 className="t-h3">{page.approach.engagementTitle}</h3>
              <p className="max-w-[60ch] text-fg-muted">
                {page.approach.engagementLead}
              </p>
              <ul className="grid gap-4 md:grid-cols-3">
                {page.approach.models.map((model) => (
                  <li key={model.num} className="border border-line p-5">
                    <p className="t-data text-fg-muted">{model.num}</p>
                    <h4 className="mt-3 font-medium">{model.title}</h4>
                    <p className="mt-2 text-fg-muted">{model.text}</p>
                  </li>
                ))}
              </ul>
              <p className="t-body-s text-fg-muted">
                {page.approach.priceNote}
              </p>
            </div>
          </Container>
        </div>
      </Section>

      <Section labelledBy="solutions-title">
        <div id="solutions" className="scroll-mt-24">
          <Container className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <p className="t-label text-fg-muted">{page.solutions.kicker}</p>
              <h2 id="solutions-title" className="t-h2">
                {page.solutions.title}
              </h2>
              <p className="max-w-[60ch] text-fg-muted">
                {page.solutions.lead}
              </p>
            </div>
            <ul className="flex flex-col border-t border-line">
              {page.solutions.packages.map((item) => (
                <li key={item.num} className="border-b border-line py-6">
                  <p className="t-data text-fg-muted">{item.num}</p>
                  <h3 className="t-h3 mt-2">{item.title}</h3>
                  {"roles" in item && item.roles ? (
                    <p className="mt-2 text-sm text-fg-muted">
                      {item.roles.join(" / ")}
                    </p>
                  ) : null}
                  <p className="mt-3 max-w-[65ch] text-fg-muted">{item.text}</p>
                </li>
              ))}
            </ul>
            <div className="border border-line p-6">
              <h3 className="t-h3">{page.solutions.builderLabel}</h3>
              <p className="mt-3 max-w-[60ch] text-fg-muted">
                {page.solutions.builderLead}
              </p>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {page.solutions.categories.map((category) => (
                  <li key={category.title} className="border border-line p-5">
                    <h4 className="font-medium">{category.title}</h4>
                    <ul className="mt-3 flex flex-col gap-1 text-fg-muted">
                      {category.roles.map((role) => (
                        <li key={role}>{role}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-fg-muted">
                {page.solutions.builderOther}
              </p>
              <a
                href="#contact"
                className={buttonClass("secondary", "md", "mt-4")}
              >
                {page.solutions.builderCta}
              </a>
            </div>
          </Container>
        </div>
      </Section>

      <Section bordered labelledBy="stack-title">
        <Container className="flex flex-col gap-6">
          <p className="t-label text-fg-muted">{page.stack.kicker}</p>
          <h2 id="stack-title" className="t-h2 max-w-[16ch]">
            {page.stack.title}
          </h2>
          <p className="max-w-[65ch] text-fg-muted">{page.stack.lead}</p>
          <ul className="flex flex-wrap gap-2">
            {page.stack.items.map((item) => (
              <li key={item} className="border border-line px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section labelledBy="work-title">
        <div id="work" className="scroll-mt-24">
          <Container className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <p className="t-label text-fg-muted">{page.work.kicker}</p>
              <h2 id="work-title" className="t-h2">
                {page.work.title}
              </h2>
              <p className="max-w-[60ch] text-fg-muted">{page.work.lead}</p>
            </div>
            <div className="flex flex-col border-t border-line">
              {page.work.items.map((item) => (
                <article key={item.title} className="border-b border-line py-8">
                  <p className="t-label text-fg-muted">
                    {page.work.kickerItem}
                  </p>
                  <h3 className="t-h3 mt-3">{item.title}</h3>
                  <dl className="mt-4 flex max-w-[65ch] flex-col gap-4">
                    <div>
                      <dt className="t-label text-fg-muted">
                        {page.work.challengeLabel}
                      </dt>
                      <dd className="mt-1 text-fg-muted">{item.challenge}</dd>
                    </div>
                    <div>
                      <dt className="t-label text-fg-muted">
                        {page.work.doLabel}
                      </dt>
                      <dd className="mt-1 text-fg-muted">{item.do}</dd>
                    </div>
                    <div>
                      <dt className="t-label text-fg-muted">
                        {page.work.outcomeLabel}
                      </dt>
                      <dd className="mt-1 text-fg-muted">{item.outcome}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="border border-line p-6">
              <p className="t-label text-fg-muted">{page.work.comingKicker}</p>
              <h3 className="t-h3 mt-3">{page.work.comingTitle}</h3>
              <p className="mt-2 text-fg-muted">{page.work.comingText}</p>
            </div>
          </Container>
        </div>
      </Section>

      <Section bordered labelledBy="why-title">
        <Container className="flex flex-col gap-8">
          <p className="t-label text-fg-muted">{page.why.kicker}</p>
          <h2 id="why-title" className="t-h2 max-w-[18ch]">
            {page.why.title}
          </h2>
          <p className="max-w-[60ch] text-fg-muted">{page.why.lead}</p>
          <ul className="grid gap-4 md:grid-cols-3">
            {page.why.principles.map((item) => (
              <li key={item.title} className="border border-line p-5">
                <h3 className="t-h3">{item.title}</h3>
                <p className="mt-2 text-fg-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section labelledBy="about-title">
        <div id="about" className="scroll-mt-24">
          <Container className="flex flex-col gap-6">
            <p className="t-label text-fg-muted">{page.about.kicker}</p>
            <h2 id="about-title" className="t-h2">
              {page.about.title}
            </h2>
            {page.about.paragraphs.map((paragraph) => (
              <p key={paragraph} className="max-w-[65ch] text-fg-muted">
                {paragraph}
              </p>
            ))}
          </Container>
        </div>
      </Section>

      <Section bordered labelledBy="faq-title">
        <Container className="flex flex-col gap-8">
          <h2 id="faq-title" className="t-h2">
            {page.faq.kicker}
          </h2>
          <div className="flex flex-col border-t border-line">
            {faq.map((item) => (
              <details
                key={item.question}
                className="group border-b border-line"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="t-data text-fg-muted transition-transform duration-[120ms] group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-fg-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>

      <Section labelledBy="contact-title">
        <div id="contact" className="scroll-mt-24">
          <Container className="flex flex-col gap-6">
            <p className="t-label text-fg-muted">{page.contact.kicker}</p>
            <h2 id="contact-title" className="t-h2 max-w-[18ch]">
              {page.contact.title}
            </h2>
            <p className="t-body-l max-w-[60ch] text-fg-muted">
              {page.contact.text}
            </p>
            <ul className="flex flex-wrap gap-3">
              {page.contact.trust.map((item) => (
                <li key={item} className="t-label text-fg-muted">
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              {page.contact.links.map((link) => (
                <TextLink
                  key={link.href}
                  href={link.href}
                  className={buttonClass(
                    link.label === page.contact.links[0]?.label
                      ? "primary"
                      : "secondary",
                    "md",
                  )}
                >
                  {link.label}
                </TextLink>
              ))}
            </div>
          </Container>
        </div>
      </Section>

      <Section bordered labelledBy="privacy-title">
        <Container className="flex flex-col gap-4">
          <h2 id="privacy-title" className="t-h2">
            {page.privacy.title}
          </h2>
          <p className="max-w-[65ch] text-fg-muted">{page.privacy.text}</p>
        </Container>
      </Section>
    </main>
  );
}
