"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { navForward } from "@/components/ui/page-transition";
import type { ApplicationStatus } from "@/modules/applications/service";

export type ApplicationListItem = {
  id: string;
  jobTitle: string;
  companyName: string;
  companySlug: string;
  status: ApplicationStatus;
  createdAt: string;
  createdLabel: string;
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
    <div className="flex flex-col gap-4">
      {failed ? (
        <p className="t-body-s text-danger" role="alert">
          {t("withdrawFailed")}
        </p>
      ) : null}
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-col gap-3 border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="t-h3">{item.jobTitle}</h2>
            <Link
              href={`/companies/${item.companySlug}`}
              {...navForward}
              className="t-body-s self-start text-fg-muted underline-offset-4 hover:underline"
            >
              {item.companyName}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusBadge status={item.status}>
                {t(`status.${item.status}`)}
              </StatusBadge>
              <time dateTime={item.createdAt} className="t-data text-fg-muted">
                {item.createdLabel}
              </time>
            </div>
          </div>
          {item.canWithdraw ? (
            <Button
              variant="danger"
              disabled={pendingId === item.id}
              onClick={() => withdraw(item.id)}
            >
              {pendingId === item.id ? t("withdrawing") : t("withdraw")}
            </Button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
