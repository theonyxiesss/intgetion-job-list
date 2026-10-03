import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { OrbitBackdrop } from "@/components/ui/orbit-backdrop";

export function AuthPage({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative overflow-hidden py-10 md:py-16">
      <OrbitBackdrop faint />
      <Container narrow className="relative flex max-w-md flex-col gap-8">
        <h1 className="t-display-l">{title}</h1>
        {children}
        {footer ? (
          <div className="flex flex-col gap-2 text-fg-muted">{footer}</div>
        ) : null}
      </Container>
    </main>
  );
}
