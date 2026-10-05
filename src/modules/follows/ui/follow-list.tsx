"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Item = { slug: string; name: string };

/** Followed companies with "Unfollow" (D239). */
export function FollowList({ initial }: { initial: Item[] }) {
  const t = useTranslations("follows");
  const [items, setItems] = useState(initial);
  const [status, setStatus] = useState("");

  async function unfollow(slug: string) {
    const response = await fetch(
      `/api/companies/${encodeURIComponent(slug)}/follow`,
      { method: "DELETE" },
    ).catch(() => null);
    if (response?.ok)
      setItems((list) => list.filter((item) => item.slug !== slug));
    else setStatus(t("failed"));
  }

  return (
    <section aria-labelledby="follows-title" className="flex flex-col gap-3">
      <h2 id="follows-title" className="t-h3">
        {t("title")}
      </h2>
      {items.length === 0 ? (
        <p className="t-body text-fg-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={item.slug}
              className="flex items-center justify-between gap-4 border-b border-line py-3"
            >
              <Link href={`/companies/${item.slug}`} className="underline">
                {item.name}
              </Link>
              <Button variant="ghost" onClick={() => unfollow(item.slug)}>
                {t("unfollow")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="t-body-s text-fg-muted">
        {status}
      </p>
    </section>
  );
}
