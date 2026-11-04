"use client";

import { useTranslations } from "next-intl";

/** Screen-reader line for a loading page; `ui` is a shell namespace (D41b). */
export function LoadingStatus() {
  const t = useTranslations("ui");
  return (
    <p role="status" className="sr-only">
      {t("loading")}
    </p>
  );
}
