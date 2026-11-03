import { ArrowRight, Check, Play, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ComponentProps, ReactNode } from "react";
import { SpokiLink } from "@/components/bot/spoki-link";
import { Container } from "@/components/ui/container";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import {
  ServiceIconBox,
  type ServiceIconName,
} from "@/components/ui/service-icon";
import { TokenMark } from "@/components/ui/token-mark";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Href = ComponentProps<typeof Link>["href"];

/**
 * The platform for remote work at a glance (D601, after D594): one tile per
 * service with a way in for each side, then how Spoki works and the
 * payments, languages and Telegram strip of D594. Server-rendered with CSS
 * motion only; the one client part is the Spoki link (LCP, D461).
 */
const actionClass =
  "inline-flex min-h-9 items-center gap-1 rounded-full border border-line px-3 text-sm text-fg-muted transition-colors duration-200 hover:border-fg-subtle hover:text-fg";

function Action({ href, children }: { href: Href; children: ReactNode }) {
  return (
    <Link href={href} className={actionClass}>
      {children}
      <Icon icon={ArrowRight} size={16} />
    </Link>
  );
}

function Tile({
  icon,
  title,
  text,
  actions,
  className,
  children,
}: {
  icon: ServiceIconName;
  title: string;
  text: string;
  actions: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "home-tile home-reveal flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="relative h-48 overflow-hidden border-b border-line bg-bg md:h-56"
      >
        {children}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <div className="flex items-center gap-3">
          <ServiceIconBox name={icon} />
          <h3 className="t-h3">{title}</h3>
        </div>
        <p className="max-w-[48ch] text-fg-muted">{text}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">{actions}</div>
      </div>
    </article>
  );
}

/** Spoki, jobs, freelance, UGC and events: one tile each (D594, D601). */
export async function LandingServices() {
  const t = await getTranslations("home.landing.services");
  const nav = await getTranslations("headerNav");
  const navRoot = await getTranslations("nav");
  const ask = await getTranslations("home.landing.ask");
  const roles = ["one", "two", "three", "four"] as const;
  const steps = ["request", "work", "delivery", "review"] as const;

  return (
    <section
      aria-labelledby="home-services"
      className="border-t border-line py-16 md:py-24"
    >
      <Container className="@container flex flex-col gap-10 md:gap-14">
        <div className="home-reveal flex max-w-3xl flex-col gap-4">
          <p className="t-label text-signal">{t("label")}</p>
          <h2 id="home-services" className="t-display-l">
            {t("title")}
          </h2>
          <p className="t-body-l text-fg-muted">{t("lead")}</p>
        </div>

        {/* Columns follow the section's own width: the Spoki panel can take the
            right side of the window (container queries, not breakpoints). */}
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-6">
          <Tile
            icon="spoki"
            title={t("spoki.title")}
            text={t("spoki.text")}
            className="@2xl:col-span-2 @5xl:col-span-4"
            actions={
              <>
                <SpokiLink className={actionClass}>
                  {ask("submit")}
                  <Icon icon={ArrowRight} size={16} />
                </SpokiLink>
                <Action href="/services">{nav("orderService")}</Action>
              </>
            }
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
            icon="jobs"
            title={t("jobs.title")}
            text={t("jobs.text")}
            className="@5xl:col-span-2"
            actions={
              <>
                <Action href="/jobs">{nav("remoteJobs")}</Action>
                <Action href="/post-job">{navRoot("postJob")}</Action>
              </>
            }
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
            icon="freelance"
            title={t("freelance.title")}
            text={t("freelance.text")}
            className="@5xl:col-span-2"
            actions={
              <>
                <Action href="/freelance">{nav("findFreelancer")}</Action>
                <Action href="/freelance/tasks">{nav("freelanceTasks")}</Action>
              </>
            }
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
            icon="ugc"
            title={t("ugc.title")}
            text={t("ugc.text")}
            className="@5xl:col-span-2"
            actions={
              <>
                <Action href="/campaigns">{nav("orderUgc")}</Action>
                <Action href="/creator/workspace">{nav("creatorWork")}</Action>
              </>
            }
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
            icon="events"
            title={t("events.title")}
            text={t("events.text")}
            className="@5xl:col-span-2"
            actions={<Action href="/events">{nav("eventsConfs")}</Action>}
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
      </Container>
    </section>
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

/** How it works with Spoki, then the strip of D594 as it was. */
export async function LandingPlatform() {
  const t = await getTranslations("home.landing.platform");
  const languages = languageNames();
  const steps = ["one", "two", "three"] as const;

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
        </div>

        <ol className="grid gap-4 @3xl:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="home-reveal flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-6"
            >
              <span className="t-data text-sm text-signal">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="t-h3">{t(`steps.${step}.title`)}</span>
              <span className="text-fg-muted">{t(`steps.${step}.text`)}</span>
            </li>
          ))}
        </ol>

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
