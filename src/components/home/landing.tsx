import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ComponentProps, ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { DotArt, type DotPicture } from "./dot-art";

type Href = ComponentProps<typeof Link>["href"];

/** Small mono caption laid over a dot picture. */
function Tag({
  children,
  muted = false,
  className,
}: {
  children: ReactNode;
  muted?: boolean;
  className: string;
}) {
  return (
    <span
      className={cn(
        "t-label absolute bg-bg px-1 text-[11px] whitespace-nowrap",
        muted ? "text-fg-muted" : "text-signal",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Title with the arrow that slides in on hover (DESIGN.md 6.4). */
function Title({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 font-medium text-fg">
      {children}
      <span
        aria-hidden="true"
        className="-translate-x-1 transition-transform duration-200 group-hover:translate-x-0"
      >
        →
      </span>
    </span>
  );
}

function Feature({
  href,
  picture,
  title,
  text,
  tags,
}: {
  href: Href;
  picture: DotPicture;
  title: string;
  text: string;
  tags: ReactNode;
}) {
  return (
    <Link href={href} className="group flex flex-col gap-5">
      <div
        aria-hidden="true"
        className="relative aspect-[5/4] max-w-full overflow-hidden rounded-[4px] border border-line-strong bg-bg"
      >
        <DotArt picture={picture} />
        {tags}
      </div>
      <span className="flex flex-col gap-2">
        <Title>{title}</Title>
        <span className="max-w-[42ch] text-fg-muted transition-colors duration-200 group-hover:text-fg">
          {text}
        </span>
      </span>
    </Link>
  );
}

const MORE = [
  { key: "mutual", href: "/#faq" },
  { key: "verified", href: "/for-employers" },
  { key: "alerts", href: "/saved-searches" },
  { key: "telegram", href: "/chat" },
  { key: "salaries", href: "/salaries" },
  { key: "web3", href: "/jobs" },
] as const;

/** Three illustrated features and six plain rows (D428). */
export async function LandingFeatures() {
  const t = await getTranslations("home.landing");
  return (
    <section aria-labelledby="home-features" className="py-16 md:py-24">
      <Container className="flex flex-col gap-12 md:gap-14">
        <h2 id="home-features" className="t-display-l max-w-[18ch]">
          {t("featuresTitle")}
        </h2>
        <div className="grid gap-10 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          <Feature
            href="/jobs"
            picture="timeZone"
            title={t("tz.title")}
            text={t("tz.text")}
            tags={
              <>
                <Tag muted className="top-[14%] left-[3%]">
                  {t("tz.you")}
                </Tag>
                <Tag muted className="top-[46%] left-[3%]">
                  {t("tz.team")}
                </Tag>
                <Tag className="right-[4%] bottom-[8%]">{t("tz.overlap")}</Tag>
              </>
            }
          />
          <Feature
            href="/salaries"
            picture="salary"
            title={t("salary.title")}
            text={t("salary.text")}
            tags={
              <>
                <Tag className="top-[7%] left-[6%]">{t("salary.range")}</Tag>
                <Tag muted className="top-[7%] right-[6%]">
                  {t("salary.net")}
                </Tag>
              </>
            }
          />
          <Feature
            href="/chat"
            picture="agent"
            title={t("agent.title")}
            text={t("agent.text")}
            tags={
              <>
                <Tag className="top-[58%] right-[6%]">{t("agent.match")}</Tag>
                <Tag muted className="bottom-[8%] left-[6%]">
                  {t("agent.why")}
                </Tag>
              </>
            }
          />
        </div>
        <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {MORE.map(({ key, href }) => (
            <li key={key} className="border-t border-line">
              <Link href={href} className="group flex flex-col gap-2 pt-6 pb-7">
                <Title>{t(`more.${key}.title`)}</Title>
                <span className="max-w-[44ch] text-fg-muted transition-colors duration-200 group-hover:text-fg">
                  {t(`more.${key}.text`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Free posting against the big boards' price (docs/PRICING.md, D428). */
export async function LandingPricing() {
  const t = await getTranslations("home.landing.pricing");
  const pricing = await getTranslations("pricing");
  const rows = [
    { label: t("boards"), price: t("boardsPrice"), kind: "old" },
    { label: t("start"), price: t("startPrice"), kind: "plain" },
    { label: t("hire"), price: t("hirePrice"), kind: "lead" },
    { label: t("team"), price: t("teamPrice"), kind: "plain" },
  ] as const;
  return (
    <section aria-labelledby="home-pricing" className="py-8 md:py-12">
      <Container>
        <div className="grid overflow-hidden rounded-lg border border-line-strong bg-surface md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-start gap-5 p-6 md:p-12">
            <p className="t-label text-signal">{t("label")}</p>
            <h2 id="home-pricing" className="t-display-l">
              {t("title")}
            </h2>
            <p className="max-w-[46ch] text-fg-muted">{pricing("market")}</p>
            <ButtonLink
              href="/pricing"
              variant="secondary"
              trailingIcon={<Icon icon={ArrowRight} size={16} />}
            >
              {t("link")}
            </ButtonLink>
          </div>
          <div className="home-lines flex flex-col justify-center gap-3 border-t border-line-strong p-6 md:border-t-0 md:border-l md:p-10">
            {rows.map((row) => (
              <div
                key={row.label}
                className={cn(
                  "flex items-baseline justify-between gap-4 rounded-[4px] border bg-bg px-4 py-3",
                  row.kind === "lead" ? "border-accent" : "border-line-strong",
                )}
              >
                <span className="t-body-s text-fg-muted">{row.label}</span>
                <span
                  className={cn(
                    "t-data",
                    row.kind === "old" && "text-fg-muted line-through",
                    row.kind === "lead" && "text-signal",
                  )}
                >
                  {row.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Closing call to action. */
export async function LandingCta() {
  const t = await getTranslations();
  return (
    <section
      aria-labelledby="home-cta"
      className="border-t border-line py-20 md:py-32"
    >
      <Container className="flex flex-col items-center gap-8 text-center">
        <h2 id="home-cta" className="t-display-l">
          {t("home.landing.ctaTitle")}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/jobs">{t("home.landing.findJobs")}</ButtonLink>
          <ButtonLink href="/post-job" variant="secondary">
            {t("nav.postJob")}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
