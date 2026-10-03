import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { UnsubscribeButton } from "@/components/notifications/unsubscribe-button";
import { Container, PageHeader } from "@/components/ui/container";
import {
  catalogTitleKey,
  verifyUnsubscribe,
} from "@/modules/notifications/service";

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const result = verifyUnsubscribe(
    token ?? "",
    process.env.UNSUBSCRIBE_SECRET ?? "",
    new Date(),
  );
  if (!result.valid) notFound();

  const t = await getTranslations("notifications.unsubscribe");
  const types = await getTranslations("notifications.types");
  const key = catalogTitleKey(result.claims.type);

  return (
    <main className="py-10 md:py-16">
      <Container narrow className="flex flex-col gap-8">
        <PageHeader title={t("title")} />
        <p>{key ? types(`${key}.inapp.title`) : result.claims.type}</p>
        <UnsubscribeButton
          token={token ?? ""}
          label={t("button")}
          done={t("done")}
        />
      </Container>
    </main>
  );
}
