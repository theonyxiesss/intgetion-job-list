"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button, ButtonLink } from "@/components/ui";

export function AdminTopBar({
  search,
  sessionsLabel,
  logoutLabel,
}: {
  search: ReactNode;
  sessionsLabel: string;
  logoutLabel: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/admin-auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      {search}
      <div className="flex flex-wrap items-center gap-2">
        <ThemeToggle />
        <ButtonLink href="/admin/sessions" variant="ghost">
          {sessionsLabel}
        </ButtonLink>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={logout}
        >
          {logoutLabel}
        </Button>
      </div>
    </div>
  );
}
