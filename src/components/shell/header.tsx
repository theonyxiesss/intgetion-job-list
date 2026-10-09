import { Bell, Bot, Plus, Send, Shield, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  ButtonLink,
  Icon,
  Logo,
  ScrollFrame,
  cn,
  navFade,
} from "@/components/ui";
import { Suspense } from "react";
import { NavProgress } from "./nav-progress";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { hasSessionMark } from "@/lib/supabase/session-mark";
import { hasCandidateProfile } from "@/modules/candidates/service";
import { countUnread } from "@/modules/notifications/service";
import { BottomNav } from "./bottom-nav";
import { MobileNav, type NavItem } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

const iconLink =
  "relative inline-flex size-11 items-center justify-center text-fg-muted transition-colors hover:text-fg";

/** These two header actions only. Important utilities beat ButtonLink's default size. */
const headerCta = "min-h-9! px-3! text-[12px]! tracking-[0.08em]!";

/** Site header (DESIGN.md 8.11). */
export async function Header() {
  const t = await getTranslations();
  // Set by the proxy, which already checked the session (D41).
  const signedIn = hasSessionMark(await headers());
  let unread = 0;
  let isAdmin = false;
  let candidate = false;
  let employer = false;
  if (signedIn) {
    try {
      const user = await requireUser();
      isAdmin = user.platformRole === "admin";
      employer = user.accountType === "employer";
      unread = await countUnread(user.id);
      candidate = await hasCandidateProfile(user.id);
    } catch {
      unread = 0;
    }
  }

  // Top level follows who is looking. A guest sees both sides; a signed-in
  // person sees their own. Chat and hiring pages stay in the menu.
  const main: NavItem[] = employer
    ? [
        { href: "/jobs", label: t("nav.jobs") },
        { href: "/employer/jobs", label: t("nav.myJobs") },
        { href: "/employer/company", label: t("nav.company") },
        { href: "/employer/billing", label: t("billing.nav") },
        { href: "/pricing", label: t("nav.pricing") },
      ]
    : [
        { href: "/jobs", label: t("nav.jobs") },
        ...(candidate ? [{ href: "/matches", label: t("nav.matches") }] : []),
        { href: "/pricing", label: t("nav.pricing") },
      ];
  const more: NavItem[] = employer
    ? [
        { href: "/chat", label: t("nav.chatWithAgent") },
        { href: "/post-job", label: t("nav.postJob") },
      ]
    : signedIn
      ? [
          { href: "/post-job", label: t("nav.postJob") },
          { href: "/chat", label: t("nav.chatWithAgent") },
        ]
      : [
          { href: "/post-job", label: t("nav.postJob") },
          { href: "/chat", label: t("nav.chatWithAgent") },
          { href: "/for-employers", label: t("nav.employers") },
        ];
  // Five tracked labels plus two long actions do not fit beside the wordmark
  // until the bar is wider than a laptop (D371). Fewer links can come out sooner.
  const wide = main.length >= 5;
  const bar = wide ? "min-[1440px]:flex" : "xl:flex";
  const untilBar = wide ? "min-[1440px]:hidden" : "xl:hidden";
  const account: NavItem[] = signedIn
    ? [
        { href: "/notifications", label: t("notifications.nav") },
        ...(employer
          ? []
          : [
              { href: "/applications", label: t("applications.nav") },
              { href: "/saved-jobs", label: t("nav.saved") },
              { href: "/profile", label: t("profile.nav") },
            ]),
        { href: "/settings/account", label: t("settings.title") },
        ...(isAdmin
          ? [
              { href: "/admin", label: t("nav.admin") },
              { href: "/admin/metrics", label: t("metrics.title") },
            ]
          : []),
      ]
    : [{ href: "/login", label: t("nav.login") }];

  return (
    <ScrollFrame className="sticky top-0 z-40 border-b border-line bg-bg transition-colors duration-200 data-[scrolled]:bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1376px] items-center gap-2 px-4 sm:gap-4 md:px-6 xl:px-12">
        <Link
          {...navFade}
          href="/"
          aria-label={t("product.name")}
          className="inline-flex min-h-11 shrink-0 items-center"
        >
          <Logo name={t("product.wordmark")} sub={t("product.wordmarkSub")} />
        </Link>

        <nav
          aria-label={t("nav.main")}
          className={cn(
            "ml-4 hidden min-w-0 flex-1 items-center gap-3 2xl:ml-6 2xl:gap-6",
            bar,
          )}
        >
          {main.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="t-nav inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-fg-muted transition-colors hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className="mr-1 inline-flex sm:mr-2">
            <ButtonLink
              {...navFade}
              href="/chat"
              variant="secondary"
              icon={<Icon icon={Bot} size={16} />}
              className={cn(
                headerCta,
                wide ? "size-9! px-0!" : "max-2xl:size-9! max-2xl:px-0!",
              )}
              title={t("nav.chatWithAgent")}
            >
              <span className={wide ? "sr-only" : "max-2xl:sr-only"}>
                {t("nav.chatWithAgent")}
              </span>
            </ButtonLink>
          </span>
          <span
            className={cn(
              "mr-1 hidden sm:inline-flex",
              wide ? "min-[1700px]:hidden" : "2xl:hidden",
            )}
          >
            <ButtonLink
              {...navFade}
              href="/post-job"
              size="icon"
              className="size-9!"
              title={t("nav.postJob")}
              aria-label={t("nav.postJob")}
              icon={<Icon icon={Plus} size={16} />}
            />
          </span>
          <span
            className={cn(
              "mr-2 hidden",
              wide ? "min-[1700px]:inline-flex" : "2xl:inline-flex",
            )}
          >
            <ButtonLink {...navFade} href="/post-job" className={headerCta}>
              {t("nav.postJob")}
            </ButtonLink>
          </span>
          <nav
            aria-label={t("nav.account")}
            className="flex items-center gap-1"
          >
            {signedIn ? (
              <>
                <Link
                  {...navFade}
                  href="/notifications"
                  className={iconLink}
                  title={t("notifications.nav")}
                >
                  <Icon icon={Bell} />
                  <span className="sr-only">{t("notifications.nav")}</span>
                  {unread > 0 && (
                    <span className="t-data absolute top-1 right-0 min-w-4 bg-signal px-1 text-center text-[11px] leading-4 text-bg">
                      {unread}
                    </span>
                  )}
                </Link>
                {!employer && (
                  <>
                    <span className="hidden xl:inline-flex">
                      <Link
                        {...navFade}
                        href="/applications"
                        className={iconLink}
                        title={t("applications.nav")}
                      >
                        <Icon icon={Send} />
                        <span className="sr-only">{t("applications.nav")}</span>
                      </Link>
                    </span>
                    <span className="hidden xl:inline-flex">
                      <Link
                        {...navFade}
                        href="/profile"
                        className={iconLink}
                        title={t("profile.nav")}
                      >
                        <Icon icon={User} />
                        <span className="sr-only">{t("profile.nav")}</span>
                      </Link>
                    </span>
                  </>
                )}
                {isAdmin && (
                  <span className="hidden xl:inline-flex">
                    <Link
                      {...navFade}
                      href="/admin"
                      className={iconLink}
                      title={t("nav.admin")}
                    >
                      <Icon icon={Shield} />
                      <span className="sr-only">{t("nav.admin")}</span>
                    </Link>
                  </span>
                )}
                <span className="hidden xl:inline-flex">
                  <LogoutButton compact />
                </span>
              </>
            ) : (
              // A wrapper hides them: `hidden` on the link itself would lose
              // to the button's own `inline-flex`.
              <span className="hidden sm:inline-flex">
                <ButtonLink {...navFade} href="/login" variant="secondary">
                  {t("nav.login")}
                </ButtonLink>
              </span>
            )}
          </nav>
          <span className="hidden items-center xl:inline-flex">
            <ThemeToggle />
          </span>
          <MobileNav
            items={[...main, ...more, ...account]}
            label={t("nav.menu")}
            openLabel={t("nav.menu")}
            closeLabel={t("ui.close")}
            signedIn={signedIn}
            triggerClassName={untilBar}
          />
        </div>
      </div>
      <Suspense>
        <NavProgress />
      </Suspense>
      {candidate ? (
        <BottomNav
          label={t("nav.bottom")}
          items={[
            { href: "/jobs", label: t("nav.jobs") },
            { href: "/matches", label: t("nav.matches") },
            { href: "/applications", label: t("applications.nav") },
            { href: "/chat", label: t("nav.chat") },
            { href: "/profile", label: t("profile.nav") },
          ]}
        />
      ) : null}
    </ScrollFrame>
  );
}
