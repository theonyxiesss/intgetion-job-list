import type { ReactNode } from "react";

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children}
      {footer && <div className="flex flex-col gap-2 text-sm">{footer}</div>}
    </main>
  );
}
