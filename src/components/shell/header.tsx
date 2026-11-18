import { ServiceIcon } from "@/components/ui/service-icon";
import { Bell, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { ButtonLink, Icon, Logo, ScrollFrame, navFade } from "@/components/ui";
import { SocialSignInStubs } from "@/components/auth/social-sign-in-stubs";
import { AccountMenu, type AccountLink } from "./account-menu";
import { HeaderAuth } from "./header-auth";
import { HeaderMenu, type HeaderMenuGroup } from "./header-menu";
import { Suspense } from "react";
import { NavProgress } from "./nav-progress";
import { Link } from "@/i18n/navigation";
import { requireUser, sessionUserOnce } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSessionMark } from "@/lib/supabase/session-mark";
import { sessionCard } from "@/modules/auth/service";
import { countUnread } from "@/modules/notifications/service";
import { BottomNav } from "./bottom-nav";
import { SpokiButtonLink } from "@/components/bot/spoki-link";
import { flags } from "@/config/flags";
import { MobileNav, type NavItem } from "./mobile-nav";
import { orderPhoneNav } from "./nav-icons";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/components/ui/cn";

const iconLink =
  "relative inline-flex size-11 items-center justify-center text-fg-muted transition-colors hover:text-fg";

/** These two header actions only. Important utilities beat ButtonLink's default size. */
const headerCta = "min-h-9! px-4! text-[14px]!";

/** Site header (DESIGN.md 8.11). */
export async function Header({
  navigationOnly = false,
}: { navigationOnly?: boolean } = {}) {
  const t = await getTranslations();
  // Set by the proxy, which already checked the session (D41).
  const signedIn = hasSessionMark(await headers());
  let unread = 0;
  let isAdmin = false;
  let accountName = "";
  let accountEmail: string | null = null;
  if (signedIn) {
    try {
      const user = await requireUser(sessionUserOnce);
      isAdmin = user.platformRole === "admin";
      unread = await countUnread(user.id);
      const card = await sessionCard((await createSupabaseServerClient()).auth);
      accountName = card?.name ?? "";
      accountEmail = card?.email ?? null;
    } catch {
      unread = 0;
    }
  }

  // Site sections live in the left rail from xl up (D477, D478) and in the
  // menu below it; the top bar keeps only the employer's own pages (D488).
  const sections: NavItem[] = [
    { href: "/jobs", label: t("nav.jobs") },
    { href: "/events", label: t("nav.events") },
    { href: "/freelance", label: t("nav.freelance") },
    { href: "/freelance/tasks", label: t("nav.taskBoard") },
    { href: "/campaigns", label: t("nav.campaigns") },
    { href: "/services", label: t("nav.services") },
  ];
  // Every account gets every platform function (D583 follow-up): the
  // company pages create or show a company, so nothing waits for membership.
  const main: NavItem[] = signedIn
    ? [
        { href: "/employer/jobs", label: t("nav.myJobs") },
        { href: "/employer/billing", label: t("billing.nav") },
      ]
    : [];
  const more: NavItem[] = signedIn
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
  // One account for every service (D506, D517): the account page holds the
  // profile; company pages appear only by membership, a right, not a kind.
  const cabinet: AccountLink[] = [
    { href: "/applications", label: t("applications.nav") },
    { href: "/saved-jobs", label: t("nav.saved") },
  ];
  const account: NavItem[] = signedIn
    ? [
        { href: "/account", label: t("account.nav") },
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
        { href: "/account", label: t("account.nav") },
        { href: "/applications", label: t("applications.nav") },
        { href: "/saved-jobs", label: t("nav.saved") },
        { href: "/notifications", label: t("notifications.nav") },
        { href: "/settings/account", label: t("settings.title") },
        { href: "/employer/jobs", label: t("nav.myJobs") },
        ...(isAdmin
          ? [
              { href: "/admin", label: t("nav.admin") },
              { href: "/admin/metrics", label: t("metrics.title") },
            ]
          : []),
      ]
    : [];
  if (navigationOnly) {
    return (
      <div className="md:hidden">
        <MobileNav
          items={orderPhoneNav(
            [...sections, ...main, ...more, ...account],
            signedIn ? "member" : "guest",
          )}
          label={t("nav.menu")}
          openLabel={t("nav.menu")}
          closeLabel={t("ui.close")}
          signedIn={signedIn}
          triggerClassName="hidden!"
          railessTriggerClassName="hidden!"
        />
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
      </div>
    );
  }
  // Upwork-style groups (D592); each item says what it does (D596).
  const menuGroups: HeaderMenuGroup[] = [
    {
      label: t("headerNav.hire"),
      links: [
        { href: "/post-job", label: t("nav.postJob") },
        { href: "/freelance", label: t("headerNav.findFreelancer") },
        { href: "/campaigns", label: t("headerNav.orderUgc") },
        { href: "/services", label: t("headerNav.orderService") },
        ...(signedIn
          ? [
              { href: "/employer/jobs", label: t("nav.myJobs") },
              { href: "/employer/billing", label: t("headerNav.billing") },
            ]
          : []),
      ],
    },
    {
      label: t("headerNav.findWork"),
      links: [
        { href: "/jobs", label: t("headerNav.remoteJobs") },
        { href: "/freelance/tasks", label: t("headerNav.freelanceTasks") },
        { href: "/creator/workspace", label: t("headerNav.creatorWork") },
        { href: "/events", label: t("headerNav.eventsConfs") },
      ],
    },
    { href: "/chat", label: t("headerNav.spokiAgent") },
    { href: "/pricing", label: t("nav.pricing") },
  ];

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
          <Logo name={t("product.wordmark")} />
        </Link>

        {/* Sections with dropdowns from xl up (D592, D596: action words need room);
            below that the menu sheet and tab bar keep them. */}
        <div className="ml-4 hidden min-w-0 xl:flex 2xl:ml-8">
          <HeaderMenu label={t("nav.main")} groups={menuGroups} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 max-md:ml-0 max-md:w-full">
          <span
            data-header-chat
            className={cn(
              "mr-1 inline-flex sm:mr-2",
              flags.spokiDockEnabled && "lg:hidden",
            )}
          >
            {flags.spokiDockEnabled ? (
              // Opens and closes the one Spoki panel (D525); a link without JS.
              <SpokiButtonLink
                variant="secondary"
                size="icon"
                icon={<ServiceIcon name="spoki" size={20} />}
                className="size-11! p-0!"
                title={t("nav.chatWithAgent")}
                aria-label={t("nav.chatWithAgent")}
              />
            ) : (
              <ButtonLink
                {...navFade}
                href="/chat"
                variant="secondary"
                size="icon"
                icon={<ServiceIcon name="spoki" size={20} />}
                className="size-11! p-0!"
                title={t("nav.chatWithAgent")}
                aria-label={t("nav.chatWithAgent")}
              />
            )}
          </span>
          {/* Both actions live in the dropdowns from xl up (D592, D596). */}
          <span className="mr-1 inline-flex max-md:mr-auto xl:hidden">
            <ButtonLink
              {...navFade}
              href="/post-job"
              className={headerCta}
              icon={<Icon icon={Plus} size={16} />}
            >
              {t("nav.postJob")}
            </ButtonLink>
          </span>
          <span className="mr-1 inline-flex xl:hidden">
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
              <span className="hidden items-center gap-1 sm:inline-flex">
                <HeaderAuth social={<SocialSignInStubs />} />
              </span>
            )}
          </nav>
          <span className="hidden items-center xl:inline-flex">
            <ThemeToggle />
          </span>
          <MobileNav
            items={orderPhoneNav(
              [...sections, ...main, ...more, ...account],
              signedIn ? "member" : "guest",
            )}
            label={t("nav.menu")}
            openLabel={t("nav.menu")}
            closeLabel={t("ui.close")}
            signedIn={signedIn}
            triggerClassName="xl:hidden max-md:hidden"
            railessTriggerClassName="max-md:hidden"
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
