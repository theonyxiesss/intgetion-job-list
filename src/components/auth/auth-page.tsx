import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { LoginNext } from "@/components/auth/login-next";
import { Container } from "@/components/ui/container";
import { OrbitBackdrop } from "@/components/ui/orbit-backdrop";
import { ServiceIcon } from "@/components/ui/service-icon";
import { flags } from "@/config/flags";
import { Link } from "@/i18n/navigation";

/**
 * Shell of every auth screen: login, register, reset, check email (D330).
 * A heading of the h2 size, not a display one: these are forms, not
 * landing pages. `break-words` keeps long addresses and errors inside.
 */
export async function AuthPage({
  title,
  intro,
  children,
  footer,
  mode,
  next,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  mode?: "login" | "register";
  next?: LoginNext;
}) {
  if (flags.uiV2Enabled) {
    const nav = await getTranslations("nav");
    const tabClass = (active: boolean) =>
      `flex min-h-10 flex-1 items-center justify-center rounded-[10px] text-sm font-medium ${active ? "bg-line-strong text-fg" : "text-fg-muted hover:text-fg"}`;

    return (
      <main className="flex flex-1 items-start justify-center px-4 py-10 md:items-center md:py-16">
        <div className="flex w-full max-w-[420px] min-w-0 flex-col gap-5 break-words">
          <header className="flex flex-col items-center gap-2.5 text-center">
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-[14px] bg-accent text-accent-fg"
            >
              <ServiceIcon name="spoki" size={24} />
            </span>
            <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
            {intro ? (
              <div className="max-w-[60ch] text-sm text-fg-muted">{intro}</div>
            ) : null}
          </header>
          {mode ? (
            <nav
              aria-label={`${nav("login")} / ${nav("register")}`}
              className="flex gap-1 rounded-[14px] border border-line-strong bg-surface-2 p-1"
            >
              <Link
                href={next ? { pathname: "/login", query: { next } } : "/login"}
                aria-current={mode === "login" ? "page" : undefined}
                className={tabClass(mode === "login")}
              >
                {nav("login")}
              </Link>
              <Link
                href={next ? { pathname: "/register", query: { next } } : "/register"}
                aria-current={mode === "register" ? "page" : undefined}
                className={tabClass(mode === "register")}
              >
                {nav("register")}
              </Link>
            </nav>
          ) : null}
          {children}
          {footer ? (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-fg-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden py-10 md:py-16">
      <OrbitBackdrop faint />
      <Container
        narrow
        className="relative flex max-w-md min-w-0 flex-col gap-6 break-words"
      >
        <header className="flex flex-col gap-3">
          <h1 className="t-h2">{title}</h1>
          {intro ? (
            <div className="max-w-[60ch] text-fg-muted">{intro}</div>
          ) : null}
        </header>
        {children}
        {footer ? (
          <div className="flex flex-col gap-2 border-t border-line pt-6 text-fg-muted">
            {footer}
          </div>
        ) : null}
      </Container>
    </main>
  );
}
