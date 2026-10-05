"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** "Save search" under the catalog filters, for a signed-in user (D233). */
export function SaveSearchButton({
  query,
  name,
}: {
  query: string;
  /** Built from the active filter chips. */
  name: string;
}) {
  const t = useTranslations("savedSearches");
  const [state, setState] = useState<
    "idle" | "busy" | "saved" | "limit" | "failed"
  >("idle");

  async function save() {
    setState("busy");
    const response = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, name }),
    }).catch(() => null);
    setState(
      response?.ok ? "saved" : response?.status === 409 ? "limit" : "failed",
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        onClick={save}
        disabled={state === "busy" || state === "saved"}
      >
        {t("save")}
      </Button>
      <p role="status" className="t-body-s text-fg-muted">
        {state === "saved" ? (
          <>
            {t("saved")}{" "}
            <Link href="/saved-searches" className="underline">
              {t("manage")}
            </Link>
          </>
        ) : state === "limit" ? (
          t("limit")
        ) : state === "failed" ? (
          t("failed")
        ) : (
          ""
        )}
      </p>
    </div>
  );
}
