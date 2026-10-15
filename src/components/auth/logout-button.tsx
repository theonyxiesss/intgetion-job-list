"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "@/i18n/navigation";

/**
 * Sign out. `compact` shows only the icon (the name stays for AT).
 * `row` is a full-width menu row; the default stays the pill used in the phone sheet.
 */
export function LogoutButton({
  compact = false,
  row = false,
}: {
  compact?: boolean;
  row?: boolean;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
    setPending(false);
  }

  if (row) {
    return (
      <Button
        variant="ghost"
        onClick={logout}
        loading={pending}
        icon={<Icon icon={LogOut} />}
        className="min-h-11 w-full justify-start! rounded-md! px-3! text-danger!"
      >
        {t("logout")}
      </Button>
    );
  }

  return compact ? (
    <Button
      variant="ghost"
      size="icon"
      onClick={logout}
      loading={pending}
      aria-label={t("logout")}
      title={t("logout")}
      icon={<Icon icon={LogOut} />}
    />
  ) : (
    <Button
      variant="secondary"
      onClick={logout}
      loading={pending}
      icon={<Icon icon={LogOut} />}
    >
      {t("logout")}
    </Button>
  );
}
