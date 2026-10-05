"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { Link } from "@/i18n/navigation";

type Item = { id: string; name: string; query: string; alert: boolean };

/** Own saved searches: open, alert on/off, delete (D233). */
export function SavedSearchList({ initial }: { initial: Item[] }) {
  const t = useTranslations("savedSearches");
  const [items, setItems] = useState(initial);
  const [status, setStatus] = useState("");

  async function toggle(id: string, alert: boolean) {
    setItems((list) =>
      list.map((item) => (item.id === id ? { ...item, alert } : item)),
    );
    const response = await fetch(`/api/saved-searches/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alert }),
    }).catch(() => null);
    if (!response?.ok) {
      setItems((list) =>
        list.map((item) =>
          item.id === id ? { ...item, alert: !alert } : item,
        ),
      );
      setStatus(t("failed"));
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/saved-searches/${id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (response?.ok) {
      setItems((list) => list.filter((item) => item.id !== id));
      setStatus(t("deleted"));
    } else {
      setStatus(t("failed"));
    }
  }

  if (items.length === 0) {
    return <p className="t-body text-fg-muted">{t("empty")}</p>;
  }
  return (
    <>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 border-b border-line py-4 md:flex-row md:items-center md:justify-between"
          >
            <Link
              href={`/jobs?${item.query}`}
              className="t-h3 break-words underline"
            >
              {item.name}
            </Link>
            <div className="flex flex-wrap items-center gap-4">
              <Switch
                label={t("alert")}
                checked={item.alert}
                onChange={(event) => toggle(item.id, event.target.checked)}
              />
              <Button variant="ghost" onClick={() => remove(item.id)}>
                {t("delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p role="status" className="t-body-s text-fg-muted">
        {status}
      </p>
    </>
  );
}
