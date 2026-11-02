import { ArrowRight, Check, Play, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ComponentProps, ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { TokenMark } from "@/components/ui/token-mark";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Href = ComponentProps<typeof Link>["href"];

/**
 * The whole platform at a glance (D594): one account for jobs, freelance,
 * UGC and events, with Spoki through all of it. Server-rendered with CSS
 * motion only, so the home page ships no extra client JS (LCP, D461).
 */
function Tile({
  href,
  title,
  text,
  open,
  className,
  children,
}: {
  href: Href;
  title: string;
  text: string;
  open: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "home-tile home-reveal group flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="relative h-48 overflow-hidden border-b border-line bg-bg md:h-56"
      >
        {children}
      </div>
      <span className="flex flex-1 flex-col gap-2 p-6">
        <span className="t-h3">{title}</span>
        <span className="max-w-[48ch] text-fg-muted">{text}</span>
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm text-fg-muted transition-colors duration-200 group-hover:text-fg">
          {open}
          <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1">
            <Icon icon={ArrowRight} size={16} />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Own-language names of the site's languages, from the browser's data. */
function languageNames(): string[] {
  return routing.locales.map((locale) => {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(
      locale,
    );
    return name
      ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
      : locale;
  });
}

export async function LandingPlatform() {
  const t = await getTranslations("home.landing.platform");
  const languages = languageNames();
  const roles = ["one", "two", "three", "four"] as const;
  const steps = ["request", "work", "delivery", "review"] as const;

  return (
    <section
      aria-labelledby="home-platform"
      className="border-t border-line py-16 md:py-24"
    >
      <Container className="@container flex flex-col gap-10 md:gap-14">
        <div className="home-reveal flex max-w-3xl flex-col gap-4">
          <p className="t-label text-signal">{t("label")}</p>
          <h2 id="home-platform" className="t-display-l">
            {t("title")}
          </h2>
          <p className="t-body-l text-fg-muted">{t("lead")}</p>
        </div>

        {/* Columns follow the section's own width: the Spoki panel can take the
            right side of the window (container queries, not breakpoints). */}
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-6">
          <Tile
            href="/chat"
            title={t("spoki.title")}
            text={t("spoki.text")}
            open={t("open")}
            className="@2xl:col-span-2 @5xl:col-span-4"
          >
            <div className="home-seq absolute inset-0 flex flex-col justify-center gap-3 px-6 md:px-10">
              <p className="self-end rounded-2xl bg-surface-2 px-4 py-2 text-sm text-fg">
                {t("spoki.ask")}
              </p>
              <p className="flex items-center gap-3 text-sm">
                <span className="spoki-orb" />
                <span className="spoki-shimmer">{t("spoki.step")}</span>
              </p>
              <p className="ml-10 flex flex-wrap items-center gap-2 text-sm text-fg">
                <Icon icon={Check} size={16} className="text-signal" />
                <span className="t-data rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
                  {t("spoki.chipOne")}
                </span>
                <span className="t-data rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
                  {t("spoki.chipTwo")}
                </span>
                <span className="text-fg-subtle">→</span>
                {t("spoki.found")}
              </p>
              <p className="ml-10 rounded-lg border border-accent px-4 py-2 text-sm text-fg">
                {t("spoki.fit")}
              </p>
            </div>
          </Tile>

          <Tile
            href="/jobs"
            title={t("jobs.title")}
            text={t("jobs.text")}
            open={t("open")}
            className="@5xl:col-span-2"
          >
            <div className="home-fade-y absolute inset-0 overflow-hidden px-5">
              <ul className="home-ticker flex flex-col gap-3 py-3">
                {[...roles, ...roles].map((role, index) => (
                  <li
                    key={`${role}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-fg">
                        {t(`jobs.roles.${role}`)}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {t("jobs.remote")}
                      </span>
                    </span>
                    <span className="t-data shrink-0 text-xs text-signal">
                      {t(`jobs.pay.${role}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Tile>

          <Tile
            href="/freelance"
            title={t("freelance.title")}
            text={t("freelance.text")}
            open={t("open")}
            className="@5xl:col-span-2"
          >
            <div className="absolute inset-0 flex flex-col justify-center gap-6 px-6">
              <div className="relative h-px bg-line">
                <span className="home-runner absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-accent" />
              </div>
              <ol className="flex justify-between gap-2">
                {steps.map((step) => (
                  <li key={step} className="t-data text-[11px] text-fg-muted">
                    {t(`freelance.steps.${step}`)}
                  </li>
                ))}
              </ol>
              <p className="t-data text-center text-sm text-fg">
                {t("freelance.price")}
              </p>
            </div>
          </Tile>

          <Tile
            href="/campaigns"
            title={t("ugc.title")}
            text={t("ugc.text")}
            open={t("open")}
            className="@5xl:col-span-2"
          >
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              <span className="h-28 w-16 rounded-lg border border-line bg-surface md:h-32 md:w-[4.5rem]" />
              <span className="relative flex h-36 w-20 items-center justify-center rounded-lg border border-line-strong bg-surface-2 md:h-40 md:w-[5.5rem]">
                <span className="flex size-9 items-center justify-center rounded-full bg-fg text-bg">
                  <Icon icon={Play} size={16} />
                </span>
                <span className="home-pulse t-data absolute -bottom-3 rounded-full bg-accent px-2 py-0.5 text-[11px] whitespace-nowrap text-accent-fg">
                  {t("ugc.accepted")}
                </span>
              </span>
              <span className="h-28 w-16 rounded-lg border border-line bg-surface md:h-32 md:w-[4.5rem]" />
            </div>
          </Tile>

          <Tile
            href="/events"
            title={t("events.title")}
            text={t("events.text")}
            open={t("open")}
            className="@5xl:col-span-2"
          >
            <ul className="absolute inset-0 flex flex-col justify-center gap-3 px-6">
              {(["one", "two", "three"] as const).map((item, index) => (
                <li
                  key={item}
                  className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-2.5"
                >
                  <span className="t-data w-12 shrink-0 text-xs text-signal">
                    {t(`events.dates.${item}`)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">
                    {t(`events.names.${item}`)}
                  </span>
                  {index === 0 ? (
                    <span className="home-blink size-1.5 shrink-0 rounded-full bg-accent" />
                  ) : null}
                </li>
              ))}
            </ul>
          </Tile>
        </div>

        <div className="home-reveal grid overflow-hidden rounded-xl border border-line-strong bg-surface @3xl:grid-cols-3">
          <div className="flex flex-col gap-4 p-6">
            <span aria-hidden="true" className="flex -space-x-2">
              <TokenMark token="USDC" />
              <TokenMark token="USDT" />
            </span>
            <span className="t-h3">{t("pay.title")}</span>
            <span className="text-fg-muted">{t("pay.text")}</span>
          </div>
          <div className="flex flex-col gap-4 border-t border-line p-6 @3xl:border-t-0 @3xl:border-l">
            <div
              aria-hidden="true"
              className="home-fade-x -mx-6 overflow-hidden"
            >
              <ul className="home-marquee flex w-max gap-2">
                {[...languages, ...languages].map((name, index) => (
                  <li
                    key={`${name}-${index}`}
                    className="t-data rounded-full border border-line px-3 py-1.5 text-xs whitespace-nowrap text-fg"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
            <span className="t-h3">{t("langs.title")}</span>
            <span className="text-fg-muted">{t("langs.text")}</span>
          </div>
          <div className="flex flex-col gap-4 border-t border-line p-6 @3xl:border-t-0 @3xl:border-l">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-signal"
            >
              <Icon icon={Send} size={16} />
            </span>
            <span className="t-h3">{t("reach.title")}</span>
            <span className="text-fg-muted">{t("reach.text")}</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
