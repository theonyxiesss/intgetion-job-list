import { Bell, Send, Shield, User } from "lucide-react";
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
import { MobileNav, type NavItem } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

const iconLink =
  "relative inline-flex size-11 items-center justify-center text-fg-muted transition-colors hover:text-fg";

/** Site header (DESIGN.md 8.11). */
export async function Header() {
  const t = await getTranslations();
  // Set by the proxy, which already checked the session (D41).
  const signedIn = hasSessionMark(await headers());
  let unread = 0;
  let isAdmin = false;
  let candidate = false;
  if (signedIn) {
    try {
      const user = await requireUser();
      isAdmin = user.platformRole === "admin";
      unread = await countUnread(user.id);
      candidate = await hasCandidateProfile(user.id);
    } catch {
      unread = 0;
    }
  }

  const main: NavItem[] = [
    { href: "/jobs", label: t("nav.jobs") },
    ...(candidate ? [{ href: "/matches", label: t("nav.matches") }] : []),
    { href: "/chat", label: t("nav.chat") },
    // A guest reads about hiring first (D204); a member goes to their jobs.
    {
      href: signedIn ? "/employer/jobs" : "/for-employers",
      label: t("nav.employers"),
    },
  ];
  const account: NavItem[] = signedIn
    ? [
        { href: "/notifications", label: t("notifications.nav") },
        { href: "/applications", label: t("applications.nav") },
        { href: "/saved-jobs", label: t("nav.saved") },
        { href: "/profile", label: t("profile.nav") },
        ...(isAdmin ? [{ href: "/admin", label: t("nav.admin") }] : []),
      ]
    : [
        { href: "/login", label: t("nav.login") },
        { href: "/register", label: t("nav.register") },
      ];

  return (
    <ScrollFrame className="sticky top-0 z-40 border-b border-line bg-bg transition-colors duration-200 data-[scrolled]:bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1376px] items-center gap-4 px-4 md:px-6 xl:px-12">
        <Link
          {...navFade}
          href="/"
          aria-label={t("product.name")}
          className="inline-flex min-h-11 items-center"
        >
          <Logo name={t("product.wordmark")} sub={t("product.wordmarkSub")} />
        </Link>

        <nav
          aria-label={t("nav.main")}
          className="ml-6 hidden flex-1 items-center gap-8 lg:flex"
        >
          {main.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="t-nav inline-flex min-h-11 items-center text-fg-muted transition-colors hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
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
                <Link
                  {...navFade}
                  href="/applications"
                  className={cn(iconLink, "hidden lg:inline-flex")}
                  title={t("applications.nav")}
                >
                  <Icon icon={Send} />
                  <span className="sr-only">{t("applications.nav")}</span>
                </Link>
                <Link
                  {...navFade}
                  href="/profile"
                  className={cn(iconLink, "hidden lg:inline-flex")}
                  title={t("profile.nav")}
                >
                  <Icon icon={User} />
                  <span className="sr-only">{t("profile.nav")}</span>
                </Link>
                {isAdmin && (
                  <Link
                    {...navFade}
                    href="/admin"
                    className={cn(iconLink, "hidden lg:inline-flex")}
                    title={t("nav.admin")}
                  >
                    <Icon icon={Shield} />
                    <span className="sr-only">{t("nav.admin")}</span>
                  </Link>
                )}
                <span className="hidden lg:inline-flex">
                  <LogoutButton compact />
                </span>
              </>
            ) : (
              // A wrapper hides them: `hidden` on the link itself would lose
              // to the button's own `inline-flex`.
              <span className="hidden gap-1 sm:inline-flex">
                <ButtonLink {...navFade} href="/login" variant="ghost">
                  {t("nav.login")}
                </ButtonLink>
                <ButtonLink {...navFade} href="/register" variant="secondary">
                  {t("nav.register")}
                </ButtonLink>
              </span>
            )}
          </nav>
          <span className="hidden items-center lg:inline-flex">
            <ThemeToggle />
          </span>
          <MobileNav
            items={[...main, ...account]}
            label={t("nav.menu")}
            openLabel={t("nav.menu")}
            closeLabel={t("ui.close")}
            signedIn={signedIn}
          />
        </div>
      </div>
      <Suspense>
        <NavProgress />
      </Suspense>
    </ScrollFrame>
  );
}
