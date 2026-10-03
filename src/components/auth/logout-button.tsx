"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "@/i18n/navigation";

/** Sign out. `compact` shows only the icon (the name stays for AT). */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
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
