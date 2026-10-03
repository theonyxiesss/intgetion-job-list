"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { ApplicationStatus } from "@/modules/applications/service";

export type ApplicationListItem = {
  id: string;
  jobTitle: string;
  status: ApplicationStatus;
  canWithdraw: boolean;
};

export function ApplicationList({ items }: { items: ApplicationListItem[] }) {
  const t = useTranslations("applications");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function withdraw(id: string) {
    setPendingId(id);
    setFailed(false);
    const response = await fetch(`/api/applications/${id}/withdraw`, {
      method: "POST",
    });
    setPendingId(null);
    if (!response.ok) {
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {failed ? <p>{t("withdrawFailed")}</p> : null}
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-col gap-2 border border-current/20 p-4"
        >
          <h3 className="text-lg font-semibold">{item.jobTitle}</h3>
          <p>{t(`status.${item.status}`)}</p>
          {item.canWithdraw ? (
            <button
              type="button"
              className="inline-flex min-h-11 w-fit items-center border border-current px-3"
              disabled={pendingId === item.id}
              onClick={() => withdraw(item.id)}
            >
              {pendingId === item.id ? t("withdrawing") : t("withdraw")}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
