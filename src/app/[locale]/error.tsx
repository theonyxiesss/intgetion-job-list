"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Container, Icon, OrbitBackdrop } from "@/components/ui";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <main className="relative flex flex-1 items-center overflow-hidden py-24">
      <OrbitBackdrop faint />
      <Container className="relative flex flex-col items-start gap-6">
        <p className="t-data-l text-danger">{t("error.code")}</p>
        <h1 className="t-display-l">{t("error.title")}</h1>
        <p className="max-w-[48ch] text-fg-muted">{t("error.body")}</p>
        <Button
          variant="secondary"
          onClick={reset}
          icon={<Icon icon={RotateCcw} />}
        >
          {t("error.retry")}
        </Button>
        {error.digest && (
          <p className="t-caption text-fg-subtle">
            {t("ui.requestId")} <span className="t-data">{error.digest}</span>
          </p>
        )}
      </Container>
    </main>
  );
}
