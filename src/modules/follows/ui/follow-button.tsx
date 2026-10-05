"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** "Follow" on a company page (D239); guests are sent to sign in. */
export function FollowButton({
  slug,
  initial,
  signedIn,
}: {
  slug: string;
  initial: boolean;
  signedIn: boolean;
}) {
  const t = useTranslations("follows");
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"limit" | "failed" | null>(null);

  if (!signedIn) {
    return (
      <Link href="/login" className={buttonClass("secondary")}>
        {t("follow")}
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/companies/${encodeURIComponent(slug)}/follow`,
      { method: following ? "DELETE" : "POST" },
    ).catch(() => null);
    setBusy(false);
    if (response?.ok) setFollowing(!following);
    else setError(response?.status === 409 ? "limit" : "failed");
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
      >
        {following ? t("following") : t("follow")}
      </Button>
      <p className="t-caption max-w-[40ch] text-fg-muted">
        {error ? t(error) : t("hint")}
      </p>
    </div>
  );
}
