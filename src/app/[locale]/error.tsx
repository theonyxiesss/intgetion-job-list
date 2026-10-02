"use client";

import { useTranslations } from "next-intl";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p>{t("body")}</p>
      <button
        type="button"
        className="min-h-11 w-fit rounded-md border border-current px-4"
        onClick={reset}
      >
        {t("retry")}
      </button>
    </main>
  );
}
