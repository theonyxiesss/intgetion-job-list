import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth-guards";
import { HttpError } from "@/lib/http";
import {
  catalogTitleKey,
  listNotifications,
} from "@/modules/notifications/service";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect({ href: "/login", locale });
    }
    throw error;
  }

  const t = await getTranslations("notifications");
  const types = await getTranslations("notifications.types");
  const feed = await listNotifications(user.id, {});

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <MarkAllReadButton label={t("markAll")} />
      </div>
      {feed.items.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {feed.items.map((item) => {
            const key = catalogTitleKey(item.type);
            const payload = (item.payload ?? {}) as Record<string, string>;
            return (
              <li key={item.id} className="border border-current/20 p-3">
                <p className="font-semibold">
                  {key ? types(`${key}.inapp.title`) : item.type}
                </p>
                <p>
                  {key
                    ? types(`${key}.inapp.body`, {
                        jobTitle: payload.jobTitle ?? "",
                        status: payload.status ?? "",
                        decision: payload.decision ?? "",
                        companyName: payload.companyName ?? "",
                        date: payload.expiresAt?.slice(0, 10) ?? "",
                        count: Number(
                          payload.applicationCount ?? payload.matchCount ?? 0,
                        ),
                      })
                    : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
