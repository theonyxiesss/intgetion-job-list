import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/admin/cookies";
import { AdminShell, requireAdminPage } from "@/components/admin/admin-page";
import { listMySessions } from "@/modules/admin-console/service";
import { SessionRevoke } from "@/components/admin/session-revoke";

export default async function AdminSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminPage();
  const t = await getTranslations("admin");
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  const sessions = token ? await listMySessions(token) : [];
  return (
    <AdminShell title={t("sessionsTitle")} active="home">
      {sessions && sessions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3 border border-line px-4 py-3"
            >
              <span className="t-body">
                {session.deviceClass}
                {session.country ? ` · ${session.country}` : ""}
                {session.current ? ` · ${t("thisSession")}` : ""}
              </span>
              <SessionRevoke id={session.id} label={t("revoke")} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-muted">{t("sessionsEmpty")}</p>
      )}
    </AdminShell>
  );
}
