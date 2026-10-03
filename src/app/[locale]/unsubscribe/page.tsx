import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { UnsubscribeButton } from "@/components/notifications/unsubscribe-button";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p>{key ? types(`${key}.inapp.title`) : result.claims.type}</p>
      <UnsubscribeButton
        token={token ?? ""}
        label={t("button")}
        done={t("done")}
      />
    </main>
  );
}
