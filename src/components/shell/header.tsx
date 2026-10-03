import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { LogoutButton } from "@/components/auth/logout-button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-guards";
import { hasSessionMark } from "@/lib/supabase/session-mark";
import { countUnread } from "@/modules/notifications/service";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const t = await getTranslations();
  // Set by the proxy, which already checked the session (D41).
  const signedIn = hasSessionMark(await headers());
  let unread = 0;
  if (signedIn) {
    try {
      const user = await requireUser();
      unread = await countUnread(user.id);
    } catch {
      unread = 0;
    }
  }

  return (
    <header className="border-b border-current/15">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="min-h-11 text-lg font-semibold">
          {t("product.name")}
        </Link>
        <nav aria-label={t("nav.main")} className="flex flex-1 gap-2">
          <a href="#search" className="inline-flex min-h-11 items-center px-2">
            {t("home.findJob")}
          </a>
          <a href="#post" className="inline-flex min-h-11 items-center px-2">
            {t("home.postJob")}
          </a>
        </nav>
        <nav aria-label={t("nav.account")} className="flex gap-1">
          {signedIn ? (
            <>
              <Link
                href="/notifications"
                className="inline-flex min-h-11 items-center px-2"
              >
                {t("notifications.nav")}
                {unread > 0 ? ` (${unread})` : ""}
              </Link>
              <Link
                href="/applications"
                className="inline-flex min-h-11 items-center px-2"
              >
                {t("applications.nav")}
              </Link>
              <Link
                href="/profile"
                className="inline-flex min-h-11 items-center px-2"
              >
                {t("profile.nav")}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center px-2"
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center px-2"
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </nav>
        <nav aria-label={t("nav.language")} className="flex gap-1">
          {routing.locales.map((locale) => (
            <Link
              key={locale}
              href="/"
              locale={locale}
              className="inline-flex min-h-11 items-center px-2"
            >
              {t(`locale.${locale}`)}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
