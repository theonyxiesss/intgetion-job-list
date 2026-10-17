import { Bell, Bot, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import {
  ButtonLink,
  Icon,
  Logo,
  ScrollFrame,
  cn,
  navFade,
} from "@/components/ui";
import { SocialSignInStubs } from "@/components/auth/social-sign-in-stubs";
import { AccountMenu, type AccountLink } from "./account-menu";
import { HeaderAuth } from "./header-auth";
import { Suspense } from "react";
import { NavProgress } from "./nav-progress";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSessionMark } from "@/lib/supabase/session-mark";
import { sessionCard } from "@/modules/auth/service";
import { countUnread } from "@/modules/notifications/service";
import { BottomNav } from "./bottom-nav";
import { MobileNav, type NavItem } from "./mobile-nav";
import { orderPhoneNav } from "./nav-icons";
import { ThemeToggle } from "./theme-toggle";

const iconLink =
  "relative inline-flex size-11 items-center justify-center text-fg-muted transition-colors hover:text-fg";

/** These two header actions only. Important utilities beat ButtonLink's default size. */
const headerCta = "min-h-9! px-4! text-[14px]!";

/** Site header (DESIGN.md 8.11). */
export async function Header() {
  const t = await getTranslations();
  // Set by the proxy, which already checked the session (D41).
  const signedIn = hasSessionMark(await headers());
  let unread = 0;
  let isAdmin = false;
  let employer = false;
  let accountName = "";
  let accountEmail: string | null = null;
  if (signedIn) {
    try {
      const user = await requireUser();
      isAdmin = user.platformRole === "admin";
      employer = user.accountType === "employer";
      unread = await countUnread(user.id);
      const card = await sessionCard((await createSupabaseServerClient()).auth);
      accountName = card?.name ?? "";
      accountEmail = card?.email ?? null;
    } catch {
      unread = 0;
    }
  }

  // Top level follows who is looking. A guest sees both sides; a signed-in
  // person sees their own. Chat and hiring pages stay in the menu.
  const main: NavItem[] = employer
    ? [
        { href: "/jobs", label: t("nav.jobs") },
        { href: "/events", label: t("nav.events") },
        { href: "/freelance", label: t("nav.freelance") },
        { href: "/campaigns", label: t("nav.campaigns") },
        { href: "/services", label: t("nav.services") },
        { href: "/employer/jobs", label: t("nav.myJobs") },
        { href: "/employer/company", label: t("nav.company") },
        { href: "/employer/billing", label: t("billing.nav") },
      ]
    : [
        { href: "/jobs", label: t("nav.jobs") },
        { href: "/events", label: t("nav.events") },
        { href: "/freelance", label: t("nav.freelance") },
        { href: "/campaigns", label: t("nav.campaigns") },
        { href: "/services", label: t("nav.services") },
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
  const cabinet: AccountLink[] = employer
    ? []
    : [
        { href: "/profile", label: t("profile.nav") },
        { href: "/applications", label: t("applications.nav") },
        { href: "/saved-jobs", label: t("nav.saved") },
      ];
  const account: NavItem[] = signedIn
    ? [
        { href: "/notifications", label: t("notifications.nav") },
        ...cabinet,
        { href: "/settings/account", label: t("settings.title") },
        ...(isAdmin
          ? [
              { href: "/admin", label: t("nav.admin") },
              { href: "/admin/metrics", label: t("metrics.title") },
            ]
          : []),
      ]
    : [{ href: "/login", label: t("nav.login") }];
  const accountMenu: AccountLink[] = signedIn
    ? [
        { href: "/profile", label: t("profile.nav") },
        { href: "/applications", label: t("applications.nav") },
        { href: "/saved-jobs", label: t("nav.saved") },
        { href: "/notifications", label: t("notifications.nav") },
        { href: "/settings/account", label: t("settings.title") },
        ...(employer
          ? [
              { href: "/employer/jobs", label: t("nav.myJobs") },
              { href: "/employer/company", label: t("nav.company") },
            ]
          : []),
        ...(isAdmin
          ? [
              { href: "/admin", label: t("nav.admin") },
              { href: "/admin/metrics", label: t("metrics.title") },
            ]
          : []),
      ]
    : [];

  return (
    <ScrollFrame className="sticky top-0 z-40 border-b border-transparent bg-bg transition-colors duration-200 data-[scrolled]:border-line">
      <div className="mx-auto flex h-16 w-full max-w-[1376px] items-center gap-2 px-4 sm:gap-4 md:px-6 xl:px-12">
        {/* Phones get the space for actions; the tab bar is the way around (D468). */}
        <Link
          {...navFade}
          href="/"
          aria-label={t("product.name")}
          className="inline-flex min-h-11 shrink-0 items-center max-md:hidden"
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

        <div className="ml-auto flex shrink-0 items-center gap-1 max-md:ml-0 max-md:w-full">
          <span data-header-chat className="mr-1 inline-flex sm:mr-2">
            <ButtonLink
              {...navFade}
              href="/chat"
              variant="secondary"
              size="icon"
              icon={<Icon icon={Bot} size={16} />}
              className="size-11! p-0!"
              title={t("nav.chatWithAgent")}
              aria-label={t("nav.chatWithAgent")}
            />
          </span>
          <span className="mr-1 inline-flex max-md:mr-auto">
            <ButtonLink
              {...navFade}
              href="/post-job"
              className={headerCta}
              icon={<Icon icon={Plus} size={16} />}
            >
              {t("nav.postJob")}
            </ButtonLink>
          </span>
          <span className="mr-1 inline-flex">
            <ButtonLink
              {...navFade}
              href="/pricing"
              variant="plan"
              className={headerCta}
            >
              {t("nav.pro")}
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
                    <span className="t-data absolute top-1 right-0 min-w-4 rounded-full bg-signal px-1 text-center text-[11px] leading-4 text-bg">
                      {unread}
                    </span>
                  )}
                </Link>
                <span className="hidden sm:inline-flex">
                  <AccountMenu
                    label={t("nav.account")}
                    links={accountMenu}
                    name={accountName}
                    email={accountEmail}
                  />
                </span>
              </>
            ) : (
              <span className="hidden sm:inline-flex">
                <HeaderAuth social={<SocialSignInStubs />} />
              </span>
            )}
          </nav>
          <span className="hidden items-center xl:inline-flex">
            <ThemeToggle />
          </span>
          <MobileNav
            items={orderPhoneNav(
              [...main, ...more, ...account],
              employer ? "employer" : signedIn ? "candidate" : "guest",
            )}
            label={t("nav.menu")}
            openLabel={t("nav.menu")}
            closeLabel={t("ui.close")}
            signedIn={signedIn}
            triggerClassName={cn(untilBar, "max-md:hidden")}
          />
        </div>
      </div>
      <Suspense>
        <NavProgress />
      </Suspense>
      <BottomNav
        label={t("nav.bottom")}
        moreLabel={t("nav.more")}
        items={[
          { href: "/jobs", label: t("nav.jobs") },
          { href: "/freelance", label: t("nav.freelance") },
          { href: "/chat", label: t("nav.chat") },
          { href: "/campaigns", label: t("nav.campaigns") },
        ]}
      />
    </ScrollFrame>
  );
}
