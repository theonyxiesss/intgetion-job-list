import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { OrbitBackdrop } from "@/components/ui/orbit-backdrop";

/**
 * Shell of every auth screen: login, register, reset, check email (D330).
 * A heading of the h2 size, not a display one: these are forms, not
 * landing pages. `break-words` keeps long addresses and errors inside.
 */
export function AuthPage({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
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
